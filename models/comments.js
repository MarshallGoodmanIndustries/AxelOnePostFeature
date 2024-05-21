const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema(
  {
    author: {
        type: String
    },
    post:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        required: true
    }],
    comment:{
      type: String,
      required: true
    }
},
{ timestamps: true }
);

module.exports  = mongoose.model("Comment", CommentSchema);
