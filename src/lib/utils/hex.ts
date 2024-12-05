const HEX_ALPHABET = "0123456789ABCDEF";
const HEX_BASE = HEX_ALPHABET.length;

export const toHex = (byteArray: Uint8Array): string => {
    var result = "";

    for (let index = 0; index < byteArray.length; index++) {
        const value = byteArray[index];
        result += HEX_ALPHABET[Math.floor(value / HEX_BASE)] + HEX_ALPHABET[value % HEX_BASE];
    }

    return result;
};
