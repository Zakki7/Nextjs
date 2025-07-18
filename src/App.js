import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';


const app = express();

app.use(cors({
    origin : process.env.CORS_ORIGIN,
    methods : ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}))

app.use(express.json({limit : "16kb"}))
app.use(express.urlencoded({extended : true , limit : "16kb"}))
app.use(express.static("Public"))
app.use(cookieParser())

// Routes 
import userRouter from './routes/user.routes.js'

app.use("/api/v1/users", userRouter)

app.post("/test", (req, res) => {
  return res.status(200).json({ message: "OK working!" });
});

// http://localhost:8000/api/v1/users/register

export {app}

