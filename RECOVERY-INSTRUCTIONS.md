# EMERGENCY RECOVERY INSTRUCTIONS

## If UI Breaks Again:

```
git reset --hard v1.0-WORKING-UI
npm install --legacy-peer-deps
npm start
```

## If Backend Breaks:

```
git reset --hard STABLE-BASELINE
npm install --legacy-peer-deps
npm start
```

## Complete Reset to Working State:

```
git checkout GOLDEN-BACKUP-2024-12-06
git reset --hard
npm install --legacy-peer-deps
npm start
```

## Working Features Confirmed:

- ✅ All sidebar items visible and clickable
- ✅ LangChain backend at 100% success rate
- ✅ 191 templates in library
- ✅ All pages load without errors
- ✅ AI generation working with OpenAI

## DO NOT:

- Run bulk updates
- Allow "complete restructuring"
- Trust "I'll fix everything" promises
- Delete any backup branches

Last confirmed working: December 6, 2024
