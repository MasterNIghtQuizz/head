import os

dockerfiles = [
    "docker/Dockerfile.api-gateway",
    "docker/Dockerfile.ms-quizz-management",
    "docker/Dockerfile.ms-response",
    "docker/Dockerfile.ms-session",
    "docker/Dockerfile.ms-user",
    "docker/Dockerfile.ws-service"
]

for df in dockerfiles:
    if not os.path.exists(df):
        continue
    
    with open(df, "r") as f:
        lines = f.readlines()
    
    new_lines = []
    inserted = False
    for line in lines:
        new_lines.append(line)
        if ".yarnrc.yml ./" in line and not inserted:
            new_lines.append("COPY .pnp.* ./\n")
            new_lines.append("COPY .yarn ./.yarn\n")
            inserted = True
    
    with open(df, "w") as f:
        f.writelines(new_lines)
    print(f"Updated {df}")

