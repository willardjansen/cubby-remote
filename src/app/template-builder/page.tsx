'use client';

import { useState, useEffect } from 'react';
import JSZip from 'jszip';

interface MapFile {
  name: string;
  path: string;
  folder: string;
}

interface FolderNode {
  name: string;
  path: string;
  maps: MapFile[];
  subfolders: Record<string, FolderNode>;
  selected: boolean;
  indeterminate: boolean;
}

export default function TemplateBuilder() {
  const [serverMaps, setServerMaps] = useState<MapFile[]>([]);
  const [folderTree, setFolderTree] = useState<FolderNode | null>(null);
  const [selectedMaps, setSelectedMaps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Load server maps
  useEffect(() => {
    fetch('/api/expression-maps')
      .then(res => res.json())
      .then(data => {
        const maps = data.maps || [];
        setServerMaps(maps);
        buildFolderTree(maps);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load maps:', err);
        setLoading(false);
      });
  }, []);

  // Build folder tree structure
  const buildFolderTree = (maps: MapFile[]) => {
    const root: FolderNode = {
      name: 'Root',
      path: '',
      maps: [],
      subfolders: {},
      selected: false,
      indeterminate: false,
    };

    maps.forEach(map => {
      const parts = map.folder.split('/').filter(Boolean);
      let current = root;

      parts.forEach(part => {
        if (!current.subfolders[part]) {
          current.subfolders[part] = {
            name: part,
            path: current.path ? `${current.path}/${part}` : part,
            maps: [],
            subfolders: {},
            selected: false,
            indeterminate: false,
          };
        }
        current = current.subfolders[part];
      });

      current.maps.push(map);
    });

    setFolderTree(root);
  };

  // Toggle folder selection
  const toggleFolder = (folderPath: string) => {
    if (!folderTree) return;

    const newSelected = new Set(selectedMaps);
    const toggleNode = (node: FolderNode, path: string) => {
      if (node.path === folderPath) {
        const shouldSelect = !node.selected && !node.indeterminate;

        // Select/deselect all maps in this folder and subfolders
        const collectMaps = (n: FolderNode): MapFile[] => {
          const maps = [...n.maps];
          Object.values(n.subfolders).forEach(sub => {
            maps.push(...collectMaps(sub));
          });
          return maps;
        };

        const allMaps = collectMaps(node);
        allMaps.forEach(map => {
          if (shouldSelect) {
            newSelected.add(map.path);
          } else {
            newSelected.delete(map.path);
          }
        });

        return true;
      }

      for (const sub of Object.values(node.subfolders)) {
        if (toggleNode(sub, path)) return true;
      }
      return false;
    };

    toggleNode(folderTree, folderPath);
    setSelectedMaps(newSelected);
  };

  // Update selection state
  const updateSelectionState = (node: FolderNode): void => {
    // Update children first
    Object.values(node.subfolders).forEach(updateSelectionState);

    // Count selected maps
    const allMaps = [...node.maps];
    Object.values(node.subfolders).forEach(sub => {
      allMaps.push(...sub.maps);
    });

    const selectedCount = allMaps.filter(m => selectedMaps.has(m.path)).length;

    if (selectedCount === 0) {
      node.selected = false;
      node.indeterminate = false;
    } else if (selectedCount === allMaps.length) {
      node.selected = true;
      node.indeterminate = false;
    } else {
      node.selected = false;
      node.indeterminate = true;
    }
  };

  if (folderTree) {
    updateSelectionState(folderTree);
  }

  // Generate DAWproject
  const generateDAWproject = async () => {
    if (selectedMaps.size === 0) {
      alert('Please select at least one expression map');
      return;
    }

    setGenerating(true);

    try {
      const selectedMapsList = serverMaps.filter(m => selectedMaps.has(m.path));

      // Generate project.xml
      const projectXml = generateProjectXML(selectedMapsList);
      const metadataXml = generateMetadataXML('Custom Template');

      // Create ZIP using JSZip
      const zip = new JSZip();
      zip.file('project.xml', projectXml);
      zip.file('metadata.xml', metadataXml);

      // Generate blob
      const blob = await zip.generateAsync({ type: 'blob' });

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Custom-Template.dawproject';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log(`Generated DAWproject with ${selectedMapsList.length} tracks`);
    } catch (error) {
      console.error('Failed to generate DAWproject:', error);
      alert('Failed to generate DAWproject');
    } finally {
      setGenerating(false);
    }
  };

  const generateProjectXML = (maps: MapFile[]): string => {
    const lines = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<Project version="1.0">');
    lines.push('\t<Application name="Cubby Remote Generator" version="1.0.0" />');
    lines.push('\t<Transport>');
    lines.push('\t\t<Tempo unit="bpm" value="120" />');
    lines.push('\t\t<TimeSignature numerator="4" denominator="4" />');
    lines.push('\t</Transport>');
    lines.push('\t<Structure>');

    maps.forEach((map, index) => {
      const id = 'id' + (index + 1);
      const name = map.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      lines.push(`\t\t<Track contentType="notes" loaded="true" id="${id}" name="${name}" color="#fe7272ff" />`);
    });

    lines.push('\t</Structure>');
    lines.push('</Project>');
    return lines.join('\n');
  };

  const generateMetadataXML = (projectName: string): string => {
    const lines = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<MetaData>');
    lines.push(`\t<Title>${projectName}</Title>`);
    lines.push('\t<Artist />');
    lines.push('\t<Album />');
    lines.push('\t<OriginalArtist />');
    lines.push('\t<Songwriter />');
    lines.push('\t<Producer />');
    lines.push('\t<Year />');
    lines.push('\t<Genre />');
    lines.push('\t<Copyright />');
    lines.push('\t<Comment>Generated by Cubby Remote - Track names match expression map filenames</Comment>');
    lines.push('</MetaData>');
    return lines.join('\n');
  };

  // Render folder tree
  const renderFolder = (node: FolderNode, depth: number = 0): JSX.Element[] => {
    const elements: JSX.Element[] = [];
    const indent = depth * 20;

    if (node.name !== 'Root') {
      elements.push(
        <div key={node.path} style={{ marginLeft: `${indent}px` }} className="py-1">
          <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-800 px-2 py-1 rounded">
            <input
              type="checkbox"
              checked={node.selected}
              ref={el => {
                if (el) el.indeterminate = node.indeterminate;
              }}
              onChange={() => toggleFolder(node.path)}
              className="w-4 h-4"
            />
            <span className="font-semibold text-blue-400">📂 {node.name}</span>
            <span className="text-gray-500 text-sm">({node.maps.length + Object.keys(node.subfolders).length})</span>
          </label>
        </div>
      );
    }

    // Render individual map files in this folder
    const fileIndent = (depth + 1) * 20;
    node.maps
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(map => {
        elements.push(
          <div key={map.path} style={{ marginLeft: `${fileIndent}px` }} className="py-0.5">
            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-700 px-2 py-1 rounded text-sm">
              <input
                type="checkbox"
                checked={selectedMaps.has(map.path)}
                onChange={(e) => {
                  const newSelected = new Set(selectedMaps);
                  if (e.target.checked) {
                    newSelected.add(map.path);
                  } else {
                    newSelected.delete(map.path);
                  }
                  setSelectedMaps(newSelected);
                }}
                className="w-4 h-4"
              />
              <span className="text-gray-300">📄 {map.name}</span>
            </label>
          </div>
        );
      });

    // Render subfolders
    Object.values(node.subfolders)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(sub => {
        elements.push(...renderFolder(sub, depth + 1));
      });

    return elements;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading expression maps...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">DAWproject Template Builder</h1>
        <p className="text-gray-400 mb-8">
          Select folders to include in your Cubase template. Track names will exactly match expression map filenames.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Folder Tree */}
          <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Expression Maps ({serverMaps.length} total)</h2>
            <div className="max-h-[600px] overflow-y-auto">
              {folderTree && renderFolder(folderTree)}
            </div>
          </div>

          {/* Summary & Actions */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Selected</h2>
            <div className="text-4xl font-bold text-blue-400 mb-2">{selectedMaps.size}</div>
            <div className="text-gray-400 mb-8">tracks</div>

            <button
              onClick={generateDAWproject}
              disabled={selectedMaps.size === 0 || generating}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              {generating ? 'Generating...' : 'Generate DAWproject'}
            </button>

            <div className="mt-8 text-sm text-gray-400">
              <h3 className="font-bold mb-2">Next Steps:</h3>
              <ol className="list-decimal list-inside space-y-1">
                <li>Download generated .dawproject file</li>
                <li>Open Cubase</li>
                <li>File → Import → DAWproject</li>
                <li>Assign expression maps to tracks</li>
                <li>Track switching will work perfectly!</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
