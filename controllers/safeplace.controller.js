// controllers/safeplace.controller.js
import SafePlace from "../models/SafePlace.js";

/**
 * POST /api/safeplaces
 * body: { name, address, latitude, longitude, meta? }
 * requires authentication (req.user.id)
 */
export const createSafePlace = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "unauthenticated" });

    const { name, address, latitude, longitude, meta } = req.body;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res.status(400).json({ error: "latitude and longitude (numbers) are required" });
    }

    const sp = await SafePlace.create({
      userId,
      name: name || "Untitled",
      address: address || "",
      location: { type: "Point", coordinates: [longitude, latitude] },
      meta: meta || {}
    });

    // Return created document (lean-like shape)
    return res.status(201).json(sp);
  } catch (err) {
    console.error("createSafePlace error", err);
    return res.status(500).json({ error: err.message || "server_error" });
  }
};

/**
 * GET /api/safeplaces
 * Query params (optional):
 * - lat & lng => returns places sorted by distance (includes distanceMeters)
 * - radius (meters) optional
 * - mine = true => only user's places
 * - limit, skip
 */
export const listSafePlaces = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { lat, lng, radius, mine, limit = 50, skip = 0 } = req.query;

    // helper to detect police from name/address
    const detectPolice = (name = "", address = "") => {
      const txt = `${name} ${address}`.toLowerCase();
      return /\bpolice\b/.test(txt) || /\bpolice station\b/.test(txt) || /\bpolice-station\b/.test(txt);
    };

    if (lat && lng) {
      const nearStage = {
        $geoNear: {
          near: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          distanceField: "distanceMeters",
          spherical: true
        }
      };
      if (radius) nearStage.$geoNear.maxDistance = Number(radius);

      const match = {};
      if (mine === "true") match.userId = userId;

      const pipeline = [nearStage, { $match: match }, { $sort: { distanceMeters: 1 } }, { $skip: Number(skip) }, { $limit: Number(limit) }];

      const results = await SafePlace.aggregate(pipeline);

      // annotate type: 'police' when name/address contains 'police'
      const annotated = results.map(r => {
        const obj = { ...r, type: r.type || (detectPolice(r.name, r.address) ? "police" : r.type) };
        return obj;
      });

      return res.json(annotated);
    }

    // fallback: paged find
    const q = {};
    if (mine === "true") q.userId = userId;
    const places = await SafePlace.find(q).sort({ createdAt: -1 }).skip(Number(skip)).limit(Number(limit)).lean();

    const annotated = places.map(r => {
      return { ...r, type: r.type || (detectPolice(r.name, r.address) ? "police" : r.type) };
    });

    return res.json(annotated);
  } catch (err) {
    console.error("listSafePlaces error", err);
    return res.status(500).json({ error: err.message || "server_error" });
  }
};

/**
 * GET /api/safeplaces/:id
 */
export const getSafePlace = async (req, res) => {
  try {
    const sp = await SafePlace.findById(req.params.id).lean();
    if (!sp) return res.status(404).json({ error: "not_found" });
    // annotate type if needed
    const added = { ...sp, type: sp.type || (/\bpolice\b/.test(((sp.name||"") + " " + (sp.address||"")).toLowerCase()) ? "police" : sp.type) };
    return res.json(added);
  } catch (err) {
    console.error("getSafePlace error", err);
    return res.status(500).json({ error: err.message || "server_error" });
  }
};

/**
 * PUT /api/safeplaces/:id
 * Only owner can update
 * Body: { name?, address?, latitude?, longitude?, meta? }
 */
export const updateSafePlace = async (req, res) => {
  try {
    const userId = req.user?.id;
    const sp = await SafePlace.findById(req.params.id);
    if (!sp) return res.status(404).json({ error: "not_found" });
    if (sp.userId !== userId) return res.status(403).json({ error: "forbidden" });

    const { name, address, latitude, longitude, meta } = req.body;
    if (name) sp.name = name;
    if (address) sp.address = address;
    if (typeof latitude === "number" && typeof longitude === "number") {
      sp.location = { type: "Point", coordinates: [longitude, latitude] };
    }
    if (meta) sp.meta = meta;
    await sp.save();
    return res.json(sp);
  } catch (err) {
    console.error("updateSafePlace error", err);
    return res.status(500).json({ error: err.message || "server_error" });
  }
};

/**
 * DELETE /api/safeplaces/:id
 * Only owner can delete
 */
export const deleteSafePlace = async (req, res) => {
  try {
    const userId = req.user?.id;
    const sp = await SafePlace.findById(req.params.id);
    if (!sp) return res.status(404).json({ error: "not_found" });
    if (sp.userId !== userId) return res.status(403).json({ error: "forbidden" });

    await SafePlace.deleteOne({ _id: req.params.id });
    return res.json({ ok: true });
  } catch (err) {
    console.error("deleteSafePlace error", err);
    return res.status(500).json({ error: err.message || "server_error" });
  }
};
