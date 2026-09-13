import { NextResponse } from 'next/server';
import getDynamicModel from '@/lib/dynamicMongo';

export async function GET(request) {
  try {
    const Question = await getDynamicModel(typeof request !== 'undefined' ? request : (typeof req !== 'undefined' ? req : arguments[0]));
    // distinct() quickly pulls all unique topic names straight from the DB engine
    const topics = await Question.distinct('topic');
    return NextResponse.json(topics, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
