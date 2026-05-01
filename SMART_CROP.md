# Smart Crop Detection Algorithm

The `csmart` crop mode supports two engines selected with `SMART_CROP_ENGINE`:

- `rekognition` (default): uses Amazon Rekognition to detect the most relevant subject
- `attention`: skips Rekognition and delegates directly to Sharp's `attention` strategy

This document describes the default `rekognition` flow implemented in the codebase.

## High-Level Flow

```text
SMART_CROP_ENGINE=attention?
        │
   yes  ▼
   ┌───────────────┐
   │ Sharp         │
   │ attention     │
   └───────────────┘
        │
   no   ▼
┌──────────────────────┐
│ Rekognition          │
│ DetectLabels         │
└──────────┬───────────┘
           │
           ▼
   Candidate instances?
           │
   no      ▼
   ┌───────────────┐
   │ Sharp         │
   │ attention     │
   └───────────────┘
           │
   yes     ▼
   Pick highest-ranked instance
           │
           ▼
   Human subject?
           │
      yes  ▼
┌──────────────────────┐
│ Rekognition          │
│ DetectFaces          │
└──────────┬───────────┘
           │
     faces found?
      │         │
   yes▼         ▼no
 use face   use label box
 anchor     or merged box
           │
           ▼
   Crop around subject box
   and resize to target
```

## Subject Detection

`DetectLabels` is the primary signal. The algorithm:

1. Converts the input to JPEG before calling Rekognition when needed.
2. Reads label instances and ignores labels without bounding boxes.
3. Filters out weak detections:
   - minimum confidence: `70`
   - minimum label instance area: `0.5%` of the image
4. Scores remaining candidates by label priority, confidence, and size.
5. Uses the highest-ranked candidate as the main subject.

## Label Priorities

The detector prefers some labels over others. Current priority groups are:

| Priority | Labels |
|----------|--------|
| Highest | `Person`, `People` |
| Very high | `Human`, `Woman`, `Man`, `Child`, `Baby` |
| High | `Dog`, `Cat`, `Pet`, `Animal`, `Bird` |
| Medium | `Car`, `Vehicle`, `Bicycle`, `Motorcycle`, `Boat` |
| Lower | `Furniture`, `Chair`, `Sofa`, `Couch`, `Table`, `Mobile Phone`, `Laptop`, `Book` |

This means a person is preferred over a boat, and a boat is preferred over furniture, even if the lower-priority object is slightly larger.

## Human Subject Refinement

When the top label is `Person` or `People`, the crop is refined with `DetectFaces`.

### Face filtering

Detected faces are kept only if they cover at least `0.25%` of the image.

### Face handling

- `1` face: use that face as the anchor
- `2+` faces: merge all kept faces into a single combined box
- `0` faces: fall back to the original label-based subject box

### Face padding

Face boxes get more generous padding than generic objects to avoid awkward crops:

- top: `80%` of face height
- bottom: `90%` of face height
- left/right: `55%` of face width

This intentionally keeps more headroom and surrounding context.

## Multi-Instance Merging

If the top candidate belongs to a mergeable label and multiple instances of that same label are present, those instances are merged into one subject box.

Current mergeable labels:

- `Person`
- `People`
- `Dog`
- `Cat`
- `Animal`
- `Bird`

This is useful for group photos, pets, or flocks where the crop should keep the full set together.

## Generic Subject Padding

When the final subject box comes from labels instead of faces, padding is applied before cropping:

- vertical: `25%` of subject height
- horizontal: `20%` of subject width

Padding is always clamped to the image boundaries.

## Crop Rectangle Calculation

Once the final subject box is known, the crop rectangle is computed to:

1. Match the requested output aspect ratio (`width / height`)
2. Stay fully inside the source image
3. Fully contain the detected subject
4. Stay centered on the subject as much as possible

If the target aspect ratio is wider than the source, the algorithm starts from full image width. Otherwise it starts from full image height, then adjusts while preserving the subject.

## Fallback Cases

The algorithm falls back to Sharp `attention` when:

- `SMART_CROP_ENGINE=attention`
- no usable label instances are returned
- Rekognition label detection fails
- no final subject box can be produced

Face refinement failure alone does not trigger a full fallback. In that case the algorithm still uses the label-based subject box.

## Detection Log Examples

Typical logs emitted by the detector:

- `Detection: no label instances → sharp attention`
- `Detection: Person (98.4%, 14.2%)`
- `Detection: merged Dog (2 instances)`
- `Detection: refined with faces (3 person instances)`
- `Detection: no faces for superwide refinement`
- `Detection: error (AccessDeniedException) → sharp attention`

## Configuration Summary

```js
SMART_CROP_ENGINE=rekognition // default
SMART_CROP_ENGINE=attention
```

Key detection thresholds from the implementation:

```js
MIN_CONFIDENCE = 70;
MIN_AREA_RATIO = 0.005;      // 0.5%
FACE_MIN_AREA_RATIO = 0.0025; // 0.25%
```
