import sharp from 'sharp';
import { awsDetectFaces, awsDetectLabels } from './aws.js';
import { log } from './logger.js';

const PRIORITY_BY_LABEL = new Map([
  ['Person', 100],
  ['People', 100],
  ['Human', 95],
  ['Woman', 95],
  ['Man', 95],
  ['Child', 95],
  ['Baby', 95],
  ['Dog', 90],
  ['Cat', 90],
  ['Pet', 85],
  ['Animal', 80],
  ['Bird', 80],
  ['Car', 75],
  ['Vehicle', 70],
  ['Bicycle', 70],
  ['Motorcycle', 70],
  ['Boat', 70],
  ['Furniture', 55],
  ['Chair', 55],
  ['Sofa', 55],
  ['Couch', 55],
  ['Table', 50],
  ['Mobile Phone', 45],
  ['Laptop', 45],
  ['Book', 40]
]);

const MERGE_LABELS = new Set(['Person', 'People', 'Dog', 'Cat', 'Animal', 'Bird']);
const MIN_CONFIDENCE = 70;
const MIN_AREA_RATIO = 0.005;
const FACE_MIN_AREA_RATIO = 0.0025;

export const detectSubject = async (imageBuffer, metadata, params) => {
  if (metadata.format !== 'jpeg') {
    imageBuffer = await sharp(imageBuffer).jpeg().toBuffer();
  }

  return detectLabels(imageBuffer, metadata, params);
};

const detectLabels = async (imageBuffer, metadata, params) => {
  try {
    const response = await awsDetectLabels(imageBuffer);

    const candidates = collectCandidates(response?.Labels, metadata);

    if (candidates.length === 0) {
      log('Detection: no label instances → sharp attention');
      return null;
    }

    const topCandidate = candidates[0];
    const sameLabel = candidates.filter(candidate => candidate.name === topCandidate.name);
    const personCount = countPersons(candidates);

    if (shouldUseFaceRefinement(topCandidate, personCount)) {
      const faceBox = await detectFaceAnchor(imageBuffer, metadata);

      if (faceBox) {
        log(`Detection: refined with faces (${personCount} person instances)`);
        return {
          strategy: 'box',
          box: faceBox
        };
      }
    }

    if (MERGE_LABELS.has(topCandidate.name) && sameLabel.length > 1) {
      log(`Detection: merged ${topCandidate.name} (${sameLabel.length} instances)`);
      return {
        strategy: 'box',
        box: addPadding(createCombinedBox(sameLabel), metadata)
      };
    }

    log(`Detection: ${topCandidate.name} (${topCandidate.confidence.toFixed(1)}%, ${(topCandidate.areaRatio * 100).toFixed(1)}%)`);
    return {
      strategy: 'box',
      box: addPadding(topCandidate.box, metadata)
    };
  } catch (error) {
    const errorMsg = error.message || error.Code || error.name || 'Unknown error';
    log(`Detection: error (${errorMsg}) → sharp attention`);
    return null;
  }
};

const collectCandidates = (labels, metadata) => {
  if (!labels) {
    return [];
  }

  const candidates = [];

  for (const label of labels) {
    const priority = PRIORITY_BY_LABEL.get(label.Name);
    if (!priority || !label.Instances?.length) {
      continue;
    }

    for (const instance of label.Instances) {
      const box = toPixelBox(instance.BoundingBox, metadata);
      const areaRatio = (box.width * box.height) / (metadata.width * metadata.height);

      if (instance.Confidence < MIN_CONFIDENCE || areaRatio < MIN_AREA_RATIO) {
        continue;
      }

      candidates.push({
        name: label.Name,
        confidence: instance.Confidence,
        areaRatio,
        score: priority * 100000 + instance.Confidence * 100 + areaRatio * 1000,
        box
      });
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
};

const toPixelBox = (box, metadata) => {
  const left = clamp(Math.round(box.Left * metadata.width), 0, metadata.width);
  const top = clamp(Math.round(box.Top * metadata.height), 0, metadata.height);
  const width = clamp(Math.round(box.Width * metadata.width), 1, metadata.width - left);
  const height = clamp(Math.round(box.Height * metadata.height), 1, metadata.height - top);

  return {
    x: left,
    y: top,
    width,
    height
  };
};

const createCombinedBox = (candidates) => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = 0;
  let maxY = 0;

  for (const candidate of candidates) {
    minX = Math.min(minX, candidate.box.x);
    minY = Math.min(minY, candidate.box.y);
    maxX = Math.max(maxX, candidate.box.x + candidate.box.width);
    maxY = Math.max(maxY, candidate.box.y + candidate.box.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
};

const addPadding = (subjectBox, metadata) => {
  const paddingVertical = subjectBox.height * 0.25;
  const paddingHorizontal = subjectBox.width * 0.2;
  const x = Math.max(0, Math.round(subjectBox.x - paddingHorizontal));
  const y = Math.max(0, Math.round(subjectBox.y - paddingVertical));

  return {
    x,
    y,
    width: Math.min(
      metadata.width - x,
      Math.round(subjectBox.width + paddingHorizontal * 2)
    ),
    height: Math.min(
      metadata.height - y,
      Math.round(subjectBox.height + paddingVertical * 2)
    )
  };
};

const clamp = (value, min, max) => {
  return Math.max(min, Math.min(value, max));
};

const countPersons = (candidates) => {
  return candidates.filter((candidate) => candidate.name === 'Person' || candidate.name === 'People').length;
};

const shouldUseFaceRefinement = (topCandidate, personCount) => {
  if (!topCandidate) {
    return false;
  }

  const isHumanSubject = topCandidate.name === 'Person' || topCandidate.name === 'People';

  return isHumanSubject && personCount > 0;
};

const detectFaceAnchor = async (imageBuffer, metadata) => {
  try {
    const response = await awsDetectFaces(imageBuffer);
    const faces = collectFaces(response?.FaceDetails, metadata);

    if (faces.length === 0) {
      log('Detection: no faces for superwide refinement');
      return null;
    }

    if (faces.length === 1) {
      return addFacePadding(faces[0], metadata);
    }

    return addFacePadding(createCombinedBox(faces.map((box) => ({ box }))), metadata);
  } catch (error) {
    const errorMsg = error.message || error.Code || error.name || 'Unknown error';
    log(`Detection: face refinement error (${errorMsg})`);
    return null;
  }
};

const collectFaces = (faceDetails, metadata) => {
  if (!faceDetails) {
    return [];
  }

  const faces = [];

  for (const face of faceDetails) {
    if (!face.BoundingBox) {
      continue;
    }

    const box = toPixelBox(face.BoundingBox, metadata);
    const areaRatio = (box.width * box.height) / (metadata.width * metadata.height);

    if (areaRatio < FACE_MIN_AREA_RATIO) {
      continue;
    }

    faces.push(box);
  }

  return faces;
};

const addFacePadding = (faceBox, metadata) => {
  const paddingTop = faceBox.height * 0.8;
  const paddingBottom = faceBox.height * 0.9;
  const paddingHorizontal = faceBox.width * 0.55;
  const x = Math.max(0, Math.round(faceBox.x - paddingHorizontal));
  const y = Math.max(0, Math.round(faceBox.y - paddingTop));

  return {
    x,
    y,
    width: Math.min(
      metadata.width - x,
      Math.round(faceBox.width + paddingHorizontal * 2)
    ),
    height: Math.min(
      metadata.height - y,
      Math.round(faceBox.height + paddingTop + paddingBottom)
    )
  };
};
