import os
import re

def rewrite(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Step 1: Replace Mongoose imports
    content = re.sub(
        r"import connectMongo from '@/lib/mongodb';[\r\n]+import Question from '@/models/Question';",
        "import getDynamicModel from '@/lib/dynamicMongo';",
        content
    )
    
    # Optional fallback if they were imported differently
    content = content.replace("import connectMongo from '@/lib/mongodb';", "import getDynamicModel from '@/lib/dynamicMongo';")
    content = content.replace("import Question from '@/models/Question';", "")

    # Step 2: Fix GET function signatures to include req/request if missing
    content = re.sub(r'export async function GET\(\) {', 'export async function GET(request) {', content)
    
    # Step 3: Replace await connectMongo() with dynamic resolution
    content = re.sub(
        r'await connectMongo\(\);',
        "const Question = await getDynamicModel(typeof request !== 'undefined' ? request : (typeof req !== 'undefined' ? req : arguments[0]));",
        content
    )
    
    # Gemini API route modifications
    if 'gemini' in file_path:
        content = re.sub(
            r'process\.env\.GEMINI_API_KEY',
            "(req.headers.get('x-gemini-key') || request?.headers?.get('x-gemini-key') || process.env.GEMINI_API_KEY)",
            content
        )
        content = content.replace('throw new Error("GEMINI_API_KEY missing");', 'throw new Error("API Key missing");')

    with open(file_path, 'w') as f:
        f.write(content)

# Apply to all
routes = [
    'src/app/api/questions/route.js',
    'src/app/api/questions/[id]/route.js',
    'src/app/api/topics/route.js',
    'src/app/api/gemini/chat/route.js',
    'src/app/api/gemini/route.js'
]

for r in routes:
    if os.path.exists(r):
        rewrite(r)
        print(f"Updated {r}")
