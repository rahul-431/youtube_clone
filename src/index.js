import dotenv from "dotenv";
import connectDB from "./db/db_connection.js";
import { app } from "./app.js";
dotenv.config({
  path: "./.env",
});

connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.log("error: " + error);
      throw error;
    });

    app.listen(process.env.PORT || 8000, () => {
      console.log(`server is running on port ${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.log("Mongodb connection failed(1) :" + error);
  });

//following is not the best approach to connect with database;
//so we dont usually do this
/*
import express from "express";
const app = express();
const port = process.env.PORT;
(async () => {
  try {
    await mongoose.connect(`mongodb://${process.env.MONGODB_URL}/${DB_NAME}`);
    app.on("error", (error) => {
      console.log("there is a problem in connecting with database");
      throw error;
    });
    app.listen(port, () => {
      console.log(`listening on this port :${port}`);
    });
  } catch (error) {
    console.error("ERROR:" + error);
  }
})();
*/
