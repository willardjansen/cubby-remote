#!/usr/bin/env node
/**
 * Generate self-signed SSL certificate for Cubby Remote
 *
 * Creates a certificate valid for localhost and local network IPs.
 * Users need to trust this certificate on their devices once.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Get all local IP addresses
function getLocalIPs() {
  const ips = ['localhost', '127.0.0.1'];
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }

  return ips;
}

// Generate certificate
function generateCertificate(certDir) {
  const keyPath = path.join(certDir, 'server.key');
  const certPath = path.join(certDir, 'server.crt');

  // Create directory if it doesn't exist
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }

  // Check if certificate already exists and is still valid
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    console.log('Certificate already exists at:', certDir);
    return { keyPath, certPath };
  }

  console.log('Generating self-signed certificate...');

  const ips = getLocalIPs();
  const sanEntries = ips.map((ip, i) => {
    if (ip === 'localhost') {
      return `DNS.${i + 1} = localhost`;
    }
    return `IP.${i + 1} = ${ip}`;
  }).join('\n');

  // Create OpenSSL config
  const opensslConfig = `
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

[dn]
C = US
ST = State
L = City
O = Cubby Remote
OU = Local Development
CN = Cubby Remote Local

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
${sanEntries}
`;

  const configPath = path.join(certDir, 'openssl.cnf');
  fs.writeFileSync(configPath, opensslConfig);

  try {
    // Generate private key and certificate
    execSync(`openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout "${keyPath}" \
      -out "${certPath}" \
      -config "${configPath}"`,
      { stdio: 'pipe' }
    );

    // Clean up config file
    fs.unlinkSync(configPath);

    console.log('✅ Certificate generated successfully!');
    console.log(`   Key: ${keyPath}`);
    console.log(`   Cert: ${certPath}`);
    console.log('');
    console.log('📱 To use on tablets/phones:');
    console.log(`   1. Open https://<your-ip>:7100 in browser`);
    console.log('   2. Accept the security warning (or install the certificate)');
    console.log('');

    return { keyPath, certPath };
  } catch (err) {
    console.error('Failed to generate certificate:', err.message);
    console.error('Make sure OpenSSL is installed.');
    return null;
  }
}

// Export for use in other modules
module.exports = { generateCertificate, getLocalIPs };

// Run directly
if (require.main === module) {
  const certDir = process.argv[2] || path.join(__dirname, 'certs');
  generateCertificate(certDir);
}
