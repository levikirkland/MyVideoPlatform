const fs = require('fs');

const MAGIC_NUMBERS = {
    mp4: '000000', // ftyp
    avi: '52494646', // RIFF
    webm: '1a45dfa3', // EBML
    mkv: '1a45dfa3', // EBML
    mov: '000000' // ftyp
};

exports.validateVideoFile = async (filePath) => {
    const buffer = Buffer.alloc(12); // Read first 12 bytes
    const fd = await fs.promises.open(filePath, 'r');
    
    try {
        await fd.read(buffer, 0, 12, 0);
        const hex = buffer.toString('hex');
        
        // Basic check for common video signatures
        // MP4/MOV usually start with ....ftyp (bytes 4-8 are ftyp)
        if (hex.includes('66747970')) return true; // ftyp
        
        // AVI starts with RIFF
        if (hex.startsWith('52494646')) return true;
        
        // WebM/MKV starts with 1A 45 DF A3
        if (hex.startsWith('1a45dfa3')) return true;

        return false;
    } catch (error) {
        console.error('File validation error:', error);
        return false;
    } finally {
        await fd.close();
    }
};
