import os
import yaml

services = ["api-gateway", "ms-quizz-management", "ms-response", "ms-session", "ms-user", "front-office"]

for service in services:
    path = f"k8s/services/{service}/base/deployment.yaml"
    if not os.path.exists(path):
        if service == "front-office":
            path = f"k8s/services/{service}/base/manifests.yaml"
    
    if os.path.exists(path):
        with open(path, "r") as f:
            content = f.read()
        
        # Replace yarn workspace command in initContainers
        content = content.replace(
            f"yarn workspace @monorepo/{service} run migrations:run",
            f"node packages/{service}/src/run-migrations.js"
        )
        
        # Add main container command override before envFrom or resources
        if "- name: " + service in content and "node packages" not in content:
            package_start = "server.js" if service == "front-office" else "src/index.js"
            node_cmd = f"node packages/{service}/{package_start}"

            # Simple string replacement where we know the structure
            if "livenessProbe" in content:
                content = content.replace(
                    "          livenessProbe:",
                    f"          command: [\"/bin/sh\", \"-c\"]\n          args:\n            - \"{node_cmd}\"\n          livenessProbe:"
                )
        
        with open(path, "w") as f:
            f.write(content)
