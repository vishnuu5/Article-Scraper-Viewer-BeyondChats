import mongoose from "mongoose";

const referenceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    link: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^https?:\/\//.test(v);
        },
        message: (props) => `${props.value} is not a valid URL!`,
      },
    },
    snippet: { type: String, required: true },
  },
  { _id: false, timestamps: false }
);

const articleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [10, "Title must be at least 10 characters long"],
      maxlength: [500, "Title cannot exceed 500 characters"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      minlength: [100, "Content must be at least 100 characters long"],
    },
    enhancedContent: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "processing", "enhanced", "error"],
      default: "pending",
    },
    lastError: {
      type: String,
      default: "",
    },
    author: {
      type: String,
      trim: true,
    },
    url: {
      type: String,
      unique: true,
      sparse: true,
      validate: {
        validator: function (v) {
          if (!v) return true; // Optional field
          return /^https?:\/\//.test(v);
        },
        message: (props) => `${props.value} is not a valid URL!`,
      },
    },
    source: {
      type: String,
      trim: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    lastEnhanced: {
      type: Date,
    },
    category: {
      type: String,
      trim: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    references: [referenceSchema],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

articleSchema.index({
  title: "text",
  content: "text",
  "references.title": "text",
  "references.snippet": "text",
});

articleSchema.virtual("publishedDate").get(function () {
  if (!this.publishedAt) return "";
  return this.publishedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
});

articleSchema.pre("save", function () {
  if (this.tags && Array.isArray(this.tags)) {
    this.tags = this.tags
      .map((tag) => (typeof tag === "string" ? tag.trim() : String(tag)))
      .filter((tag) => tag.length > 0);
  }

  if (!this.status) {
    this.status = "pending";
  }
});

articleSchema.statics.findEnhanced = function () {
  return this.find({ status: "enhanced" }).sort({ lastEnhanced: -1 });
};

articleSchema.methods.isEnhanced = function () {
  return (
    this.status === "enhanced" &&
    this.enhancedContent &&
    this.enhancedContent.length > 0
  );
};
articleSchema.methods.getEnhancementStatus = function () {
  return {
    isEnhanced: this.isEnhanced(),
    lastEnhanced: this.lastEnhanced,
    status: this.status,
    hasError: this.status === "error",
    error: this.lastError,
  };
};

const Article = mongoose.model("Article", articleSchema);

export default Article;
