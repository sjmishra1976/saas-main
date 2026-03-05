import mongoose from "mongoose";

const OrgSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, index: true },
    ownerUserId: { type: String, required: true, index: true }
  },
  { timestamps: true }
);

const SelectionSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: "Org", index: true },
    serviceId: { type: String, required: true },
    packageId: { type: String, required: true },
    configOverrides: { type: Object, default: {} },
    status: {
      type: String,
      enum: ["enrolled", "active", "inactive"],
      default: "enrolled"
    },
    instances: { type: Number, default: 1 },
    capacityOption: { type: String, default: "standard" },
    deploymentStatus: {
      type: String,
      enum: ["pending", "provisioning", "active", "failed"],
      default: "pending"
    },
    endpointUrl: { type: String, default: "" },
    editorUrl: { type: String, default: "" },
    lastDeploymentSpec: { type: Object, default: {} },
    lastDeploymentError: { type: String, default: "" }
  },
  { timestamps: true }
);

const ActivityLogSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: "Org", index: true, required: true },
    selectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Selection",
      index: true,
      required: true
    },
    eventType: { type: String, required: true },
    message: { type: String, required: true },
    metadata: { type: Object, default: {} }
  },
  { timestamps: true }
);

export const Org = mongoose.models.Org || mongoose.model("Org", OrgSchema);
export const Selection =
  mongoose.models.Selection || mongoose.model("Selection", SelectionSchema);
export const ActivityLog =
  mongoose.models.ActivityLog || mongoose.model("ActivityLog", ActivityLogSchema);
