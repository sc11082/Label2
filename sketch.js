// --- sketch.js ---
import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

let capture;
let message = "";
let showAlert = false;
let alertTimer = 0;
let alertDuration = 5000;
let detectedIngredients = [];
let showPrompt = true;
let showProcessing = false;
let ocrRecognizer;
let visionLoaded = false;
let resetTimer = false;

const inflammatoryIngredients = {
  "high fructose corn syrup": "Linked to obesity, insulin resistance, and inflammation.",
  "trans fat": "Raises bad cholesterol and increases heart disease risk.",
  "sugar": "Excess sugar promotes inflammation and metabolic issues.",
  "partially hydrogenated oil": "Main source of artificial trans fat, harmful for heart health.",
  "monosodium glutamate": "Can trigger headaches, sweating, and inflammation in sensitive people.",
  "msg": "Another name for monosodium glutamate.",
  "artificial flavors": "May contain chemical additives linked to inflammation."
};

async function setup() {
  createCanvas(640, 480);
  capture = createCapture(VIDEO);
  capture.size(640, 480);
  capture.hide();
  await loadMediaPipe();
}

function draw() {
  image(capture, 0, 0, width, height);

  if (showPrompt && visionLoaded && !showAlert && !showProcessing) {
    drawPrompt("Need to check the ingredients?");
  }

  if (showProcessing) {
    drawProcessing("Processing...");
  }

  if (message === "INFLAMMATORY") {
    drawBadge("\u26A0\uFE0F", color(255, 0, 0), width - 60, 20);
  } else if (message === "SAFE") {
    drawBadge("\u2714\uFE0F", color(0, 200, 0), width - 60, 20);
  }

  if (showAlert) {
    drawAlertCard();
    if (millis() - alertTimer > alertDuration) {
      showAlert = false;
      message = "";
      detectedIngredients = [];
      showPrompt = true;
    }
  }
}

function mousePressed() {
  if (visionLoaded && !showAlert && !showProcessing) {
    processFrame();
  }
}

async function loadMediaPipe() {
  const { FilesetResolver, TextRecognizer } = await vision;
  const visionFileset = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
  );

  ocrRecognizer = await TextRecognizer.createFromOptions(visionFileset, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/text_recognizer/latin/float16/latest/text_recognizer.task",
    },
    runningMode: "IMAGE",
  });
  visionLoaded = true;
}

async function processFrame() {
  showPrompt = false;
  showProcessing = true;

  const canvas = capture.canvas;
  const imageBitmap = await createImageBitmap(canvas);
  const result = await ocrRecognizer.recognize(imageBitmap);

  const text = result.text.toLowerCase();
  console.log("OCR Result:", text);

  detectedIngredients = containsInflammatory(text);
  message = detectedIngredients.length > 0 ? "INFLAMMATORY" : "SAFE";

  alertDuration = message === "INFLAMMATORY" ? 5000 : 2500;
  showProcessing = false;
  showAlert = true;
  alertTimer = millis();

  if (message === "INFLAMMATORY") {
    speakOutLoud(detectedIngredients);
  }
}

function containsInflammatory(text) {
  let matches = [];
  for (let ingredient in inflammatoryIngredients) {
    if (text.includes(ingredient)) {
      matches.push({
        name: ingredient,
        reason: inflammatoryIngredients[ingredient],
      });
    }
  }
  return matches;
}

function drawBadge(icon, bgColor, x, y) {
  push();
  fill(bgColor);
  noStroke();
  rect(x - 10, y - 10, 50, 40, 10);
  fill(255);
  textSize(24);
  textAlign(CENTER, CENTER);
  text(icon, x + 15, y + 10);

  if (message === "SAFE" && showAlert) {
    fill(0, 200, 0, 200);
    rect(x - 180, y, 160, 30, 8);
    fill(255);
    textSize(12);
    textAlign(LEFT, CENTER);
    text("All ingredients look safe", x - 170, y + 15);
  }
  pop();
}

function drawAlertCard() {
  if (message === "SAFE") return;

  let cardHeight = 80 + detectedIngredients.length * 40;
  let slideIn = constrain(map(millis() - alertTimer, 0, 400, 320, 0), 0, 320);
  let alpha = map(millis() - alertTimer, 0, 300, 0, 255);
  alpha = constrain(alpha, 0, 255);

  let x = width - 320 + slideIn;
  let y = 70;

  push();
  noStroke();
  drawingContext.shadowOffsetX = 2;
  drawingContext.shadowOffsetY = 2;
  drawingContext.shadowBlur = 10;
  drawingContext.shadowColor = "rgba(0, 0, 0, 0.3)";

  fill(30, 30, 30, alpha);
  rect(x, y, 300, cardHeight, 16);

  fill(255, alpha);
  textFont("Helvetica");
  textSize(14);
  textAlign(LEFT, TOP);

  let ty = y + 10;
  let tx = x + 10;
  let maxWidth = 280;

  text("\u26A0\uFE0F Inflammatory ingredients detected:", tx, ty, maxWidth, cardHeight);
  ty += 24;

  for (let item of detectedIngredients) {
    text(`• ${item.name.toUpperCase()}`, tx, ty, maxWidth, 100);
    ty += 18;
    text(`${item.reason}`, tx + 12, ty, maxWidth - 12, 100);
    ty += 28;
  }
  pop();
}

function drawPrompt(msg) {
  push();
  fill(0, 0, 0, 180);
  rect(20, height - 50, width - 40, 30, 12);
  fill(255);
  textSize(16);
  textAlign(CENTER, CENTER);
  text(msg, width / 2, height - 35);
  pop();
}

function drawProcessing(msg) {
  let fade = map(millis() % 1000, 0, 1000, 150, 255);
  push();
  fill(0, 0, 0, 180);
  rect(width / 2 - 80, height / 2 - 20, 160, 40, 10);
  fill(255, fade);
  textSize(16);
  textAlign(CENTER, CENTER);
  text(msg, width / 2, height / 2);
  pop();
}

function speakOutLoud(ingredientsList) {
  let msg = new SpeechSynthesisUtterance();
  let summary = "Warning: Inflammatory ingredients detected. ";

  for (let i = 0; i < ingredientsList.length; i++) {
    summary += `${ingredientsList[i].name}. ${ingredientsList[i].reason}. `;
  }

  msg.text = summary;
  window.speechSynthesis.speak(msg);
}
