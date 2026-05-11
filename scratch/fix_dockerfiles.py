import os

dockerfiles = [
    "docker/Dockerfile.ms-quizz-management",
    "docker/Dockerfile.ms-response",
    "docker/Dockerfile.ms-session",
    "docker/Dockerfile.ms-user",
    "docker/Dockerfile.ws-service"
]

for df in dockerfiles:
    if not os.path.exists(df):
        print(f"Skipping {df}")
        continue
    
    with open(df, "r") as f:
        content = f.read()
    
    pkg_name = df.split(".")[-1]
    # Special case for ms-quizz-management mapping
    if pkg_name == "ms-quizz-management":
        workspace_name = "@monorepo/ms-quizz-management"
    else:
        workspace_name = f"@monorepo/{pkg_name}"
    
    # Update WORKDIR in runtime stage to /app
    content = content.replace(f"WORKDIR /app/packages/{pkg_name}", "WORKDIR /app")
    
    # Update CMD
    old_cmd = f'CMD ["node", "src/index.js"]'
    new_cmd = f'CMD ["yarn", "workspace", "{workspace_name}", "run", "start"]'
    content = content.replace(old_cmd, new_cmd)
    
    with open(df, "w") as f:
        f.write(content)
    print(f"Updated {df}")

