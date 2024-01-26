import dotenv from "dotenv";
import connectDB from "./db/db_connection.js";
dotenv.config({
  path: "./env",
});

connectDB();

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
