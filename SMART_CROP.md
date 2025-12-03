# Smart Crop Detection Algorithm

The `csmart` crop mode uses AWS Rekognition to intelligently detect the main subject in an image.

## Algorithm Flow

```
┌─────────────────────────────────────────┐
│         AWS Rekognition                 │
│         Detect Faces                    │
└─────────────────────────────────────────┘
                    │
                    ▼
            ┌───────────────┐
            │ Faces found?  │
            └───────┬───────┘
                    │
        ┌───────────┴───────────┐
        │ NO                    │ YES
        ▼                       ▼
┌───────────────┐       ┌───────────────────┐
│ Sharp         │       │ Largest face ≥5%? │
│ Attention     │       │ (prominent)       │
└───────────────┘       └─────────┬─────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │ YES                       │ NO
                    ▼                           ▼
            ┌───────────────┐           ┌───────────────┐
            │ Use face box  │           │ ≥3 faces?     │
            │ with padding  │           │ (group photo) │
            └───────────────┘           └───────┬───────┘
                                                │
                                  ┌─────────────┴─────────────┐
                                  │ YES                       │ NO
                                  ▼                           ▼
                          ┌───────────────┐           ┌───────────────┐
                          │ Use combined  │           │ Sharp         │
                          │ face box      │           │ Attention     │
                          └───────────────┘           │ (background)  │
                                                      └───────────────┘
```

## Detection Cases

| Case | Condition | Action | Log Example |
|------|-----------|--------|-------------|
| **Portrait** | 1 face ≥5% | Face box with padding | `Detection: portrait (1 face, 8.5%)` |
| **Faces with prominent** | Multiple faces, largest ≥5% | Combined box | `Detection: faces with prominent (3 faces, largest 12.0%)` |
| **Group photo** | ≥3 faces, all <5% | Combined box | `Detection: group photo (8 faces, largest 2.1%)` |
| **Background faces** | 1-2 faces, all <5% | Sharp attention | `Detection: background faces (2 faces, 0.5%) → sharp attention` |
| **No faces** | 0 faces | Sharp attention | `Detection: no faces → sharp attention` |
| **Error** | API failure | Sharp attention | `Detection: error (message) → sharp attention` |

## Configuration

```javascript
const FACE_PROMINENCE_THRESHOLD = 5;  // % of image area
const GROUP_PHOTO_MIN_FACES = 3;      // minimum faces for group photo
```

## Face Box Padding

When a face is detected, padding is added to include hair and context:

- **Top**: 50% of face height (for hair/head)
- **Bottom**: 20% of face height
- **Sides**: 30% of face width

## Fallback: Sharp Attention

When no prominent faces are detected, the system falls back to Sharp's `attention` strategy, which uses libvips to find visually interesting areas (high contrast, edges, colors).

This works well for:
- Landscapes
- Architecture
- Objects
- Boats
- Any scene without prominent people

