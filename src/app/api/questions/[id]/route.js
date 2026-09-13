import { NextResponse } from 'next/server';
import getDynamicModel from '@/lib/dynamicMongo';

export async function GET(req, { params }) {
  try {
    const Question = await getDynamicModel(req);
    const { id } = params;
    const question = await Question.findById(id);
    if (!question) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(question, { status: 200 });
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function PUT(req, { params }) {
  try {
    const body = await req.json();
    const Question = await getDynamicModel(req);
    const { id } = params;
    
    // Deletion
    if (body.removeSolutionImage) {
       body.solutionImage = ''; 
       delete body.removeSolutionImage;
    }

    // Direct string saves into DB variables (Compatible with Serverless / Vercel limits)
    // NOTE: NextJS Vercel limits raw payload sizes for serverless functions (usually 4.5MB). 
    // Standard images easily fit this threshold.
    
    if (body.aiSolutionText) {
      // Repurpose the legacy local path variable as the direct text payload storage for DB
      body.aiSolutionLocalPath = body.aiSolutionText; 
      delete body.aiSolutionText; 
    }

    const question = await Question.findByIdAndUpdate(id, body, { new: true });
    return NextResponse.json(question, { status: 200 });
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function DELETE(req, { params }) {
  try {
    const Question = await getDynamicModel(req);
    const { id } = params;
    await Question.findByIdAndDelete(id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
