#!/bin/bash
set -e

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
CLUSTER="musicquiz-dev"
REGION="ap-northeast-2"
BACKUP_DIR="backups/${TIMESTAMP}"

echo "🔄 Starting pre-deployment backup at ${TIMESTAMP}"

# 1. Create backup directory
mkdir -p "${BACKUP_DIR}"

# 2. Backup current ECS Task Definitions
echo "📦 Backing up ECS Task Definitions..."
for service in auth quiz game social frontend; do
  TASK_DEF=$(aws ecs describe-services \
    --cluster ${CLUSTER} \
    --services musicquiz-dev-${service} \
    --region ${REGION} \
    --query 'services[0].taskDefinition' \
    --output text)
  
  aws ecs describe-task-definition \
    --task-definition ${TASK_DEF} \
    --region ${REGION} \
    --query 'taskDefinition' \
    > "${BACKUP_DIR}/task-def-${service}.json"
  
  echo "  ✅ Backed up ${service}: ${TASK_DEF}"
done

# 3. Backup ECR image tags
echo "📦 Backing up ECR image tags..."
for service in auth quiz game social frontend; do
  aws ecr describe-images \
    --repository-name musicquiz-dev-${service} \
    --region ${REGION} \
    --query 'imageDetails[?imageTags!=null]|[0:5].{Tags:imageTags,Digest:imageDigest,Pushed:imagePushedAt}' \
    > "${BACKUP_DIR}/ecr-images-${service}.json"
  
  echo "  ✅ Backed up ECR images for ${service}"
done

# 4. Create RDS snapshot (if exists)
echo "📦 Creating RDS snapshot..."
DB_INSTANCE=$(aws rds describe-db-instances \
  --region ${REGION} \
  --query 'DBInstances[?starts_with(DBInstanceIdentifier, `musicquiz`)].DBInstanceIdentifier' \
  --output text | head -n1)

if [ -n "${DB_INSTANCE}" ]; then
  SNAPSHOT_ID="${DB_INSTANCE}-backup-${TIMESTAMP}"
  aws rds create-db-snapshot \
    --db-instance-identifier ${DB_INSTANCE} \
    --db-snapshot-identifier ${SNAPSHOT_ID} \
    --region ${REGION}
  
  echo "  ✅ RDS snapshot created: ${SNAPSHOT_ID}"
else
  echo "  ⚠️  No RDS instance found"
fi

# 5. Save current service state
echo "📦 Saving current service state..."
aws ecs describe-services \
  --cluster ${CLUSTER} \
  --services musicquiz-dev-auth musicquiz-dev-quiz musicquiz-dev-game musicquiz-dev-social musicquiz-dev-frontend \
  --region ${REGION} \
  > "${BACKUP_DIR}/ecs-services-state.json"

# 6. Create backup manifest
cat > "${BACKUP_DIR}/MANIFEST.md" << EOF
# Backup Manifest

**Timestamp**: ${TIMESTAMP}
**Cluster**: ${CLUSTER}
**Region**: ${REGION}

## Backed Up Resources

### ECS Task Definitions
- Auth: $(cat ${BACKUP_DIR}/task-def-auth.json | jq -r '.family + ":" + (.revision|tostring)')
- Quiz: $(cat ${BACKUP_DIR}/task-def-quiz.json | jq -r '.family + ":" + (.revision|tostring)')
- Game: $(cat ${BACKUP_DIR}/task-def-game.json | jq -r '.family + ":" + (.revision|tostring)')
- Social: $(cat ${BACKUP_DIR}/task-def-social.json | jq -r '.family + ":" + (.revision|tostring)')
- Frontend: $(cat ${BACKUP_DIR}/task-def-frontend.json | jq -r '.family + ":" + (.revision|tostring)')

### RDS Snapshot
- Instance: ${DB_INSTANCE}
- Snapshot ID: ${SNAPSHOT_ID}

## Rollback Commands

\`\`\`bash
# Rollback Auth Service
aws ecs update-service \\
  --cluster ${CLUSTER} \\
  --service musicquiz-dev-auth \\
  --task-definition \$(cat ${BACKUP_DIR}/task-def-auth.json | jq -r '.family + ":" + (.revision|tostring)') \\
  --region ${REGION}

# Rollback Quiz Service
aws ecs update-service \\
  --cluster ${CLUSTER} \\
  --service musicquiz-dev-quiz \\
  --task-definition \$(cat ${BACKUP_DIR}/task-def-quiz.json | jq -r '.family + ":" + (.revision|tostring)') \\
  --region ${REGION}

# Rollback Game Service
aws ecs update-service \\
  --cluster ${CLUSTER} \\
  --service musicquiz-dev-game \\
  --task-definition \$(cat ${BACKUP_DIR}/task-def-game.json | jq -r '.family + ":" + (.revision|tostring)') \\
  --region ${REGION}

# Rollback Social Service
aws ecs update-service \\
  --cluster ${CLUSTER} \\
  --service musicquiz-dev-social \\
  --task-definition \$(cat ${BACKUP_DIR}/task-def-social.json | jq -r '.family + ":" + (.revision|tostring)') \\
  --region ${REGION}

# Rollback Frontend
aws ecs update-service \\
  --cluster ${CLUSTER} \\
  --service musicquiz-dev-frontend \\
  --task-definition \$(cat ${BACKUP_DIR}/task-def-frontend.json | jq -r '.family + ":" + (.revision|tostring)') \\
  --region ${REGION}
\`\`\`
EOF

echo ""
echo "✅ Backup completed successfully!"
echo "📁 Backup location: ${BACKUP_DIR}"
echo "📄 Manifest: ${BACKUP_DIR}/MANIFEST.md"
echo ""
echo "To rollback, use the commands in the manifest file."
