const mongoose = require("mongoose");

const mapItemsSchema = new mongoose.Schema({
  // Basic location information
  name: {
    type: String,
    required: [true, "Location name is required"],
    trim: true,
    maxlength: [100, "Name cannot exceed 100 characters"],
  },
  // Geographic coordinates
  longitude: {
    type: Number,
    required: [true, "Longitude is required"],
    min: [-180, "Longitude must be between -180 and 180"],
    max: [180, "Longitude must be between -180 and 180"],
  },
  latitude: {
    type: Number,
    required: [true, "Latitude is required"],
    min: [-90, "Latitude must be between -90 and 90"],
    max: [90, "Latitude must be between -90 and 90"],
  },
  // Google Maps specific fields
  placeId: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
    trim: true,
  },
  formattedAddress: {
    type: String,
    trim: true,
    maxlength: [500, "Address cannot exceed 500 characters"],
  },
  // Location details
  description: {
    type: String,
    trim: true,
    maxlength: [1000, "Description cannot exceed 1000 characters"],
  },
  category: {
    type: String,
    enum: ["A級美食嘉年華", "B級美食嘉年華", "咖啡廳及甜點店"],
    default: "other",
  },
  // Contact information
  phone: {
    type: String,
    trim: true,
  },
  website: {
    type: String,
    trim: true,
    match: [/^https?:\/\/.+/, "Website must be a valid URL"],
  },
  // Business hours (stored as array of objects)
  openingHours: [
    {
      day: {
        type: String,
        enum: [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ],
      },
      open: String, // Format: "HH:MM"
      close: String, // Format: "HH:MM"
      closed: {
        type: Boolean,
        default: false,
      },
    },
  ],
  // Media
  photos: [
    {
      photoReference: String, // Google Places Photo Reference
      url: String, // Direct URL to the photo
      width: Number,
      height: Number,
      attribution: String,
    },
  ],
  // Custom fields for your application
  isActive: {
    type: Boolean,
    default: true,
  },
  tags: [
    {
      type: String,
      trim: true,
    },
  ],
  // Custom metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  collection: "MapItems",
  timestamps: true, // Adds createdAt and updatedAt fields
  toJSON: {virtuals: true},
  toObject: {virtuals: true},
});
// Indexes for better query performance
mapItemsSchema.index({longitude: 1, latitude: 1}); // Geospatial queries
mapItemsSchema.index({placeId: 1}); // Google Places API lookups
mapItemsSchema.index({category: 1}); // Category filtering
mapItemsSchema.index({name: "text", description: "text"}); // Text search
mapItemsSchema.index({isActive: 1}); // Active items filtering
// Virtual for full address
mapItemsSchema.virtual("fullAddress").get(function () {
  return this.formattedAddress || `${this.latitude}, ${this.longitude}`;
});
// Virtual for coordinates array (useful for some mapping libraries)
mapItemsSchema.virtual("coordinates").get(function () {
  return [this.longitude, this.latitude];
});
// Instance method to get distance from another point
mapItemsSchema.methods.getDistanceFrom=function (lat, lng) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat - this.latitude) * Math.PI / 180;
  const dLng = (lng - this.longitude) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(this.latitude * Math.PI / 180) *
      Math.cos(lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
// Static method to find nearby locations
mapItemsSchema.statics.findNearby=function (lat, lng, maxDistance = 10) {
  return this.find({
    latitude: {$gte: lat - maxDistance / 111, $lte: lat + maxDistance / 111},
    longitude: {$gte: lng - maxDistance / 111, $lte: lng + maxDistance / 111},
    isActive: true,
  });
};
// Pre-save middleware to validate coordinates
mapItemsSchema.pre("save", function(next) {
  if (this.longitude < -180 || this.longitude > 180) {
    return next(new Error("Invalid longitude value"));
  }
  if (this.latitude < -90 || this.latitude > 90) {
    return next(new Error("Invalid latitude value"));
  }
  next();
});
module.exports = mongoose.model("MapItems", mapItemsSchema);
