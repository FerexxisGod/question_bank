import { NextResponse } from 'next/server';
import getDynamicModel from '@/lib/dynamicMongo';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req, { params }) {
  try {
    const Question = await getDynamicModel(typeof request !== 'undefined' ? request : (typeof req !== 'undefined' ? req : arguments[0]));
    const { id } = params;
    const question = await Question.findById(id);
    if (!question) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(question, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const body = await req.json();
    const Question = await getDynamicModel(typeof request !== 'undefined' ? request : (typeof req !== 'undefined' ? req : arguments[0]));
    const { id } = params;
    
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    // Explicit signal to delete image feature
    if (body.removeSolutionImage) {
       const existing = await Question.findById(id);
       if (existing?.solutionImage?.startsWith('/uploads/')) {
          try {
            const actualPath = path.join(process.cwd(), 'public', existing.solutionImage);
            await fs.unlink(actualPath);
          } catch(e) {}
       }
       body.solutionImage = null; 
       delete body.removeSolutionImage;
    }

    // Handles New Image Uploads + auto-cleans old image so they don't bloat local folder
    if (body.solutionImage && body.solutionImage.startsWith('data:image')) {
      const existing = await Question.findById(id);
      if (existing?.solutionImage?.startsWith('/uploads/')) {
          try {
            const actualPath = path.join(process.cwd(), 'public', existing.solutionImage);
            await fs.unlink(actualPath);
          } catch(e) {}
      }
      await fs.mkdir(uploadDir, { recursive: true });
      const base64Data = body.solutionImage.split(';base64,').pop();
      const ext = body.solutionImage.split(';')[0].split('/')[1] || 'png';
      const filename = `${id}_solution_${Date.now()}.${ext}`; 
      const filePath = path.join(uploadDir, filename);
      await fs.writeFile(filePath, base64Data, { encoding: 'base64' });

      body.solutionImage = `/uploads/${filename}`;
    }

    // Handle Local AI Markdown savings
    if (body.aiSolutionText) {
      await fs.mkdir(uploadDir, { recursive: true });
      const filename = `${id}_ai_solution.md`;
      const filePath = path.join(uploadDir, filename);
      await fs.writeFile(filePath, body.aiSolutionText, 'utf-8');
      body.aiSolutionLocalPath = `/uploads/${filename}`;
      delete body.aiSolutionText; 
    }

    const question = await Question.findByIdAndUpdate(id, body, { new: true });
    return NextResponse.json(question, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const Question = await getDynamicModel(typeof request !== 'undefined' ? request : (typeof req !== 'undefined' ? req : arguments[0]));
    const { id } = params;
    const question = await Question.findById(id);
    if (!question) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const deleteLocalFile = async (publicPath) => {
      if (!publicPath || !publicPath.startsWith('/uploads/')) return;
      try {
         const actualPath = path.join(process.cwd(), 'public', publicPath);
         await fs.unlink(actualPath);
      } catch (e) {
         console.warn("Could not delete local file:", e.message);
      }
    };

    await deleteLocalFile(question.solutionImage);
    await deleteLocalFile(question.aiSolutionLocalPath);

    await Question.findByIdAndDelete(id);
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
