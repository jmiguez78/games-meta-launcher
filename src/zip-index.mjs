// Lee el directorio central de un .zip sin descomprimirlo: nombre, tamaño y CRC32 de cada archivo.
// Alcanza para verificar un set de MAME, que identifica cada ROM por su CRC.
import fs from 'node:fs/promises';

const EOCD = 0x06054b50;
const ZIP64_LOCATOR = 0x07064b50;
const ZIP64_EOCD = 0x06064b50;
const CENTRAL = 0x02014b50;
const TAIL = 65557; // registro final (22 bytes) + comentario máximo (65535)

function findEocd(buffer) {
  for (let index = buffer.length - 22; index >= 0; index -= 1) if (buffer.readUInt32LE(index) === EOCD) return index;
  return -1;
}

export async function readZipEntries(file) {
  const handle = await fs.open(file, 'r');
  try {
    const { size } = await handle.stat();
    const tailLength = Math.min(size, TAIL + 20);
    const tail = Buffer.alloc(tailLength);
    await handle.read(tail, 0, tailLength, size - tailLength);
    const end = findEocd(tail);
    if (end < 0) throw new Error('No es un archivo .zip válido.');
    let count = tail.readUInt16LE(end + 10);
    let length = tail.readUInt32LE(end + 12);
    let offset = tail.readUInt32LE(end + 16);
    // Zip64: los valores reales están en otro registro, señalado por el localizador previo al final.
    if ((offset === 0xffffffff || count === 0xffff) && end >= 20 && tail.readUInt32LE(end - 20) === ZIP64_LOCATOR) {
      const record = Buffer.alloc(56);
      await handle.read(record, 0, 56, Number(tail.readBigUInt64LE(end - 12)));
      if (record.readUInt32LE(0) !== ZIP64_EOCD) throw new Error('Registro zip64 no válido.');
      count = Number(record.readBigUInt64LE(32));
      length = Number(record.readBigUInt64LE(40));
      offset = Number(record.readBigUInt64LE(48));
    }
    if (length > 64 * 1024 * 1024) throw new Error('El directorio del .zip es demasiado grande.');
    const central = Buffer.alloc(length);
    await handle.read(central, 0, length, offset);
    const entries = [];
    let position = 0;
    for (let index = 0; index < count && position + 46 <= central.length; index += 1) {
      if (central.readUInt32LE(position) !== CENTRAL) break;
      const nameLength = central.readUInt16LE(position + 28);
      const extraLength = central.readUInt16LE(position + 30);
      const commentLength = central.readUInt16LE(position + 32);
      const name = central.toString('utf8', position + 46, position + 46 + nameLength);
      if (!name.endsWith('/'))
        entries.push({
          name: name.split('/').pop(),
          size: central.readUInt32LE(position + 24),
          crc: central
            .readUInt32LE(position + 16)
            .toString(16)
            .padStart(8, '0')
        });
      position += 46 + nameLength + extraLength + commentLength;
    }
    return entries;
  } finally {
    await handle.close();
  }
}
