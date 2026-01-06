import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("ERROR: MONGODB_URI not found in environment variables");
  process.exit(1);
}

// Define minimal schema for migration
const TargetTemplateSchema = new mongoose.Schema({
  name: String,
  sortOrder: Number,
  isSystem: Boolean,
  createdAt: Date,
});

const TargetTemplate =
  mongoose.models.TargetTemplate ||
  mongoose.model("TargetTemplate", TargetTemplateSchema);

async function setTemplateSortOrder() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Get all templates ordered by name
    const templates = await TargetTemplate.find({}).sort({ isSystem: -1, name: 1 });

    console.log(`Found ${templates.length} templates to update`);

    // Set sortOrder based on current order
    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      await TargetTemplate.updateOne(
        { _id: template._id },
        { $set: { sortOrder: i } }
      );
      console.log(
        `Updated ${template.name} - sortOrder: ${i}`
      );
    }

    console.log("\n✅ Template sort order migration complete!");
  } catch (error) {
    console.error("ERROR during migration:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

setTemplateSortOrder();
