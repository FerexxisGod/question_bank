import mongoose from 'mongoose';
import { QuestionSchema } from '@/models/Question';

let conns = {};

export default async function getDynamicModel(req) {
     let uri = process.env.MONGODB_URI;
     
     // Safely attempt to override with Vercel/Client request headers
     if (req && req.headers && typeof req.headers.get === 'function') {
         const incomingUri = req.headers.get('x-mongo-uri');
         if (incomingUri) uri = incomingUri;
     }

     if (!uri) throw new Error("A personalized MongoDB URI is required. Please provide it in the login overlay!");
     
     if (conns[uri]) return conns[uri].model('Question');
     
     try {
       const conn = await mongoose.createConnection(uri, { bufferCommands: false }).asPromise();
       conn.model('Question', QuestionSchema);
       conns[uri] = conn;
       return conn.model('Question');
     } catch (e) {
       throw new Error("Failed to connect to this precise MongoDB URI: " + e.message);
     }
}
