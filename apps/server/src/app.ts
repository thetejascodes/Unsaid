import express from 'express';
import errorHandler from './common/middlewares/errorHandler.js';
const app = express();

app.get('/health',(req,res)=>{
    return res.status(200).json({message:'ok'})
})

app.use(errorHandler)
export default app;