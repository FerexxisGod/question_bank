import { NextResponse } from 'next/server';
import getDynamicModel from '@/lib/dynamicMongo';

export async function GET(request) {
  try {
    const Question = await getDynamicModel(typeof request !== 'undefined' ? request : (typeof req !== 'undefined' ? req : arguments[0]));
    const questions = await Question.find({}).sort({ createdAt: -1 });
    return NextResponse.json(questions, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const Question = await getDynamicModel(typeof request !== 'undefined' ? request : (typeof req !== 'undefined' ? req : arguments[0]));
    const question = await Question.create(body);
    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
  }
}
