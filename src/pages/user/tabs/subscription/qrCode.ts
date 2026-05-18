import QRCodeGenerator from 'qrcode-generator';

/** 生成支付二维码（DataURL） */
export const generateQRCodeDataUrl = (text: string): string => {
  const qr = QRCodeGenerator(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createDataURL(8, 4);
};
