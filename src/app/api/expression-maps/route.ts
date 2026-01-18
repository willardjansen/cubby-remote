import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Try installed app folder first, fall back to dev folder
function getExpressionMapsDir(): string {
  // Check for installed Electron app folder first
  const installedAppDir = path.join(
    process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local'),
    'Programs',
    'Cubby Remote',
    'resources',
    'expression-maps'
  );

  if (fs.existsSync(installedAppDir)) {
    console.log('Using installed app expression maps:', installedAppDir);
    return installedAppDir;
  }

  // Fall back to dev folder
  const devDir = path.join(process.cwd(), 'expression-maps');
  console.log('Using dev expression maps:', devDir);
  return devDir;
}

const EXPRESSION_MAPS_DIR = getExpressionMapsDir();

interface MapFile {
  name: string;
  path: string;
  folder: string;
}

// Ensure the expression maps directory exists
function ensureDirectoryExists() {
  if (!fs.existsSync(EXPRESSION_MAPS_DIR)) {
    fs.mkdirSync(EXPRESSION_MAPS_DIR, { recursive: true });
  }
}

// GET /api/expression-maps - List all expression maps
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('file');

  // If file path provided, return the file content
  if (filePath) {
    try {
      const fullPath = path.join(EXPRESSION_MAPS_DIR, filePath);

      // Security: ensure the path is within the expression-maps directory
      if (!fullPath.startsWith(EXPRESSION_MAPS_DIR)) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
      }

      if (!fs.existsSync(fullPath)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      return new NextResponse(content, {
        headers: { 'Content-Type': 'application/xml' }
      });
    } catch (error) {
      return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
    }
  }

  // Otherwise, list all expression maps
  try {
    ensureDirectoryExists();

    const maps: MapFile[] = [];

    const scanDirectory = (dir: string, relativePath: string = ''): void => {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const itemRelativePath = relativePath ? `${relativePath}/${item}` : item;
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scanDirectory(fullPath, itemRelativePath);
        } else if (item.endsWith('.expressionmap')) {
          maps.push({
            name: item.replace('.expressionmap', ''),
            path: itemRelativePath,
            folder: relativePath || 'Root'
          });
        }
      }
    };

    scanDirectory(EXPRESSION_MAPS_DIR);

    // Group by folder
    const grouped: Record<string, MapFile[]> = {};
    for (const map of maps) {
      if (!grouped[map.folder]) {
        grouped[map.folder] = [];
      }
      grouped[map.folder].push(map);
    }

    return NextResponse.json({ maps, grouped }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  } catch (error) {
    console.error('Error scanning expression maps:', error);
    return NextResponse.json({ error: 'Failed to scan expression maps' }, { status: 500 });
  }
}

// POST /api/expression-maps - Upload a new expression map
export async function POST(request: Request) {
  try {
    ensureDirectoryExists();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const content = formData.get('content') as string | null;
    let filename = formData.get('filename') as string | null;

    // Handle file upload
    if (file) {
      filename = file.name;
      const fileContent = await file.text();

      // Validate it's an expression map
      if (!filename.endsWith('.expressionmap')) {
        return NextResponse.json({ error: 'Invalid file type. Must be .expressionmap' }, { status: 400 });
      }

      // Sanitize filename
      const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fullPath = path.join(EXPRESSION_MAPS_DIR, safeName);

      fs.writeFileSync(fullPath, fileContent, 'utf-8');

      return NextResponse.json({
        success: true,
        filename: safeName,
        message: `Uploaded ${safeName}`
      });
    }

    // Handle content upload with filename
    if (content && filename) {
      if (!filename.endsWith('.expressionmap')) {
        filename += '.expressionmap';
      }

      const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fullPath = path.join(EXPRESSION_MAPS_DIR, safeName);

      fs.writeFileSync(fullPath, content, 'utf-8');

      return NextResponse.json({
        success: true,
        filename: safeName,
        message: `Saved ${safeName}`
      });
    }

    return NextResponse.json({ error: 'No file or content provided' }, { status: 400 });
  } catch (error) {
    console.error('Error uploading expression map:', error);
    return NextResponse.json({ error: 'Failed to upload expression map' }, { status: 500 });
  }
}

// DELETE /api/expression-maps - Delete an expression map
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('file');

    if (!filePath) {
      return NextResponse.json({ error: 'No file path provided' }, { status: 400 });
    }

    const fullPath = path.join(EXPRESSION_MAPS_DIR, filePath);

    // Security: ensure the path is within the expression-maps directory
    if (!fullPath.startsWith(EXPRESSION_MAPS_DIR)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    fs.unlinkSync(fullPath);

    return NextResponse.json({
      success: true,
      message: `Deleted ${filePath}`
    });
  } catch (error) {
    console.error('Error deleting expression map:', error);
    return NextResponse.json({ error: 'Failed to delete expression map' }, { status: 500 });
  }
}
