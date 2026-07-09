import express, { Request, Response } from "express";
import { config } from "dotenv";
import { nanoid } from "nanoid";
import connectDB from "./config/db";
import routes from "./routes";
import cookieParser from "cookie-parser";


config();

const app = express();
const PORT = process.env.PORT || 4001;

// middleware
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());

// database connected
connectDB();

app.get('/api/health', (req: Request, res: Response) => {
    return res.send("Api Healthy");
})

app.use('/api',routes);


app.listen(PORT, () => {
    console.log(`Server is started at :: ${PORT}`);
})