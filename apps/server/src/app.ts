import express from 'express';
import errorHandler from './common/middlewares/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/users.routes.js'
const app = express();

app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.use("/api/auth",authRoutes);
app.use("/api/users",userRoutes)


app.get('/health',(req,res)=>{
    return res.status(200).json({message:'ok'});
})

app.use(errorHandler);
export default app;