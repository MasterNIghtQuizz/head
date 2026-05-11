import fs from 'fs';
import path from 'path';

const packagesDir = 'packages';
const packages = fs.readdirSync(packagesDir);

const results = [];

packages.forEach(pkg => {
    const pkgDir = path.join(packagesDir, pkg);
    if (!fs.statSync(pkgDir).isDirectory()) return;

    const pkgJsonPath = path.join(pkgDir, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) return;

    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    const deps = new Set([
        ...Object.keys(pkgJson.dependencies || {}),
        ...Object.keys(pkgJson.devDependencies || {}),
        ...Object.keys(pkgJson.peerDependencies || {})
    ]);

    const missing = new Set();

    function checkDir(dir) {
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory()) {
                checkDir(filePath);
            } else if (file.endsWith('.js') || file.endsWith('.ts')) {
                const content = fs.readFileSync(filePath, 'utf8');
                const imports = content.match(/(?:import|from)\s+['"]([^'"]+)['"]/g);
                if (imports) {
                    imports.forEach(imp => {
                        const match = imp.match(/(?:import|from)\s+['"]([^'"]+)['"]/);
                        if (match) {
                            let dep = match[1];
                            if (dep.startsWith('.') || dep.startsWith('/') || dep.startsWith('node:')) return;
                            
                            // Handle scoped packages
                            if (dep.startsWith('@')) {
                                dep = dep.split('/').slice(0, 2).join('/');
                            } else {
                                dep = dep.split('/')[0];
                            }
                            
                            // Filter out built-in modules not prefixed with node:
                            const builtins = ['path', 'fs', 'crypto', 'os', 'http', 'https', 'util', 'url', 'events', 'stream', 'buffer'];
                            if (builtins.includes(dep)) return;

                            if (!deps.has(dep)) {
                                missing.add(dep);
                            }
                        }
                    });
                }
            }
        });
    }

    checkDir(path.join(pkgDir, 'src'));
    checkDir(path.join(pkgDir, 'tests'));
    checkDir(path.join(pkgDir, 'test'));

    if (missing.size > 0) {
        results.push({
            pkgName: pkgJson.name,
            pkgDir,
            missing: Array.from(missing)
        });
    }
});

console.log(JSON.stringify(results, null, 2));
