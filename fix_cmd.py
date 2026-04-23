import sys

def inject_command(filepath, service):
    with open(filepath, 'r') as f:
        content = f.read()

    # Find the main container by searching for its name and the livenessProbe
    search_str = f"          livenessProbe:"
    
    # We only want to inject it before the livenessProbe of the MAIN container
    # Since the initContainer doesn't have a livenessProbe, replacing the first occurrence is fine!
    if "node packages/" + service + "/src/index.js" not in content:
        replace_str = f"          command: [\"/bin/sh\", \"-c\"]\n          args:\n            - \"node packages/{service}/src/index.js\"\n          livenessProbe:"
        content = content.replace(search_str, replace_str, 1)

    with open(filepath, 'w') as f:
        f.write(content)

services = ["ms-quizz-management", "ms-response", "ms-session", "ms-user"]
for s in services:
    inject_command(f"k8s/services/{s}/base/deployment.yaml", s)

