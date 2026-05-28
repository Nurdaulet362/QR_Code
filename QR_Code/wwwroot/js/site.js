const elements = {
  qrText: document.getElementById("qrText"),
  qrSize: document.getElementById("qrSize"),
  generateQr: document.getElementById("generateQr"),
  clearGenerator: document.getElementById("clearGenerator"),
  qrPreview: document.getElementById("qrPreview"),
  downloadQr: document.getElementById("downloadQr"),
  copySource: document.getElementById("copySource"),
  generatorMessage: document.getElementById("generatorMessage"),
  qrImage: document.getElementById("qrImage"),
  dropZone: document.getElementById("dropZone"),
  scanCanvas: document.getElementById("scanCanvas"),
  decodeResult: document.getElementById("decodeResult"),
  openDecoded: document.getElementById("openDecoded"),
  copyDecoded: document.getElementById("copyDecoded"),
  clearScanner: document.getElementById("clearScanner"),
  scannerMessage: document.getElementById("scannerMessage")
};

let currentQrText = "";
let decodedText = "";
let generateTimer = 0;

function setMessage(element, text, type = "") {
  element.textContent = text;
  element.classList.toggle("is-error", type === "error");
  element.classList.toggle("is-success", type === "success");
}

function isProbablyUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function showGeneratorPlaceholder() {
  clearNode(elements.qrPreview);
  const placeholder = document.createElement("div");
  placeholder.className = "empty-state";
  placeholder.textContent = "QR появится здесь";
  elements.qrPreview.appendChild(placeholder);
  elements.downloadQr.disabled = true;
  elements.copySource.disabled = true;
}

function generateQrCode() {
  const value = elements.qrText.value.trim();
  const size = Number(elements.qrSize.value);

  if (!value) {
    currentQrText = "";
    showGeneratorPlaceholder();
    setMessage(elements.generatorMessage, "Вставь ссылку или текст, чтобы создать QR.");
    return;
  }

  if (typeof QRCode === "undefined") {
    setMessage(elements.generatorMessage, "Библиотека QR не загрузилась. Проверь интернет и обнови страницу.", "error");
    return;
  }

  clearNode(elements.qrPreview);
  new QRCode(elements.qrPreview, {
    text: value,
    width: size,
    height: size,
    colorDark: "#172033",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M
  });

  currentQrText = value;
  elements.downloadQr.disabled = false;
  elements.copySource.disabled = false;
  setMessage(elements.generatorMessage, "QR готов. Можно скачать PNG или скопировать исходный текст.", "success");
}

function scheduleQrGeneration() {
  window.clearTimeout(generateTimer);
  generateTimer = window.setTimeout(generateQrCode, 260);
}

function downloadQrCode() {
  const canvas = elements.qrPreview.querySelector("canvas");
  const image = elements.qrPreview.querySelector("img");
  const link = document.createElement("a");

  link.download = "qr-fast.png";
  link.href = canvas ? canvas.toDataURL("image/png") : image?.src;

  if (!link.href) {
    setMessage(elements.generatorMessage, "Не получилось подготовить картинку для скачивания.", "error");
    return;
  }

  link.click();
}

async function copyToClipboard(text, messageElement) {
  if (!text) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setMessage(messageElement, "Скопировано.", "success");
  } catch {
    setMessage(messageElement, "Браузер не дал доступ к буферу. Выдели текст вручную.", "error");
  }
}

function renderDecodedResult(value) {
  const resultValue = elements.decodeResult.querySelector(".result-value");
  resultValue.textContent = value || "QR не найден";
  resultValue.classList.toggle("muted", !value);

  decodedText = value;
  elements.copyDecoded.disabled = !value;

  if (value && isProbablyUrl(value)) {
    elements.openDecoded.href = value;
    elements.openDecoded.classList.remove("is-disabled");
  } else {
    elements.openDecoded.href = "#";
    elements.openDecoded.classList.add("is-disabled");
  }
}

function decodeImageFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    setMessage(elements.scannerMessage, "Выбери именно картинку с QR кодом.", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();

    image.onload = () => {
      const canvas = elements.scanCanvas;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      const maxSide = 1200;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));

      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);

      const imageData = context.getImageData(0, 0, width, height);
      const code = typeof jsQR === "function"
        ? jsQR(imageData.data, width, height, { inversionAttempts: "attemptBoth" })
        : null;

      if (code?.data) {
        renderDecodedResult(code.data);
        setMessage(elements.scannerMessage, "QR прочитан.", "success");
      } else {
        renderDecodedResult("");
        setMessage(elements.scannerMessage, "QR не найден. Попробуй более четкое изображение.", "error");
      }
    };

    image.onerror = () => {
      setMessage(elements.scannerMessage, "Не получилось открыть эту картинку.", "error");
    };

    image.src = reader.result;
  };

  reader.readAsDataURL(file);
}

function clearGenerator() {
  elements.qrText.value = "";
  currentQrText = "";
  showGeneratorPlaceholder();
  setMessage(elements.generatorMessage, "Данные обрабатываются только в браузере.");
  elements.qrText.focus();
}

function clearScanner() {
  elements.qrImage.value = "";
  renderDecodedResult("");
  setMessage(elements.scannerMessage, "Если QR плохо читается, попробуй более четкое фото без сильного наклона.");
}

elements.generateQr.addEventListener("click", generateQrCode);
elements.qrText.addEventListener("input", scheduleQrGeneration);
elements.qrSize.addEventListener("change", generateQrCode);
elements.downloadQr.addEventListener("click", downloadQrCode);
elements.copySource.addEventListener("click", () => copyToClipboard(currentQrText, elements.generatorMessage));
elements.clearGenerator.addEventListener("click", clearGenerator);

elements.qrImage.addEventListener("change", (event) => {
  decodeImageFile(event.target.files?.[0]);
});

elements.dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  elements.dropZone.classList.add("is-dragover");
});

elements.dropZone.addEventListener("dragleave", () => {
  elements.dropZone.classList.remove("is-dragover");
});

elements.dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  elements.dropZone.classList.remove("is-dragover");
  decodeImageFile(event.dataTransfer.files?.[0]);
});

elements.copyDecoded.addEventListener("click", () => copyToClipboard(decodedText, elements.scannerMessage));
elements.clearScanner.addEventListener("click", clearScanner);

document.addEventListener("paste", (event) => {
  const file = Array.from(event.clipboardData?.files || []).find((item) => item.type.startsWith("image/"));
  if (file) {
    decodeImageFile(file);
  }
});

showGeneratorPlaceholder();
