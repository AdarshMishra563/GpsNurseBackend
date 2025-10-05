const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

const assessmentSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    index: true
  },
  nurseId: {
    type: String,
    index: true
  },
  
  // Header Information
  headerInfo: {
    patientName: { type: String, default: '' },
    mrNumber: { type: String, default: '' },
    medicaidNumber: { type: String, default: '' },
    timeIn: { type: String, default: '' },
    timeOut: { type: String, default: '' },
    nursePrintedName: { type: String, default: '' },
    nurseSignature: { type: String, default: '' },
    patientSignature: { type: String, default: '' }
  },
  
  // Preparation Checklist
  preparationChecklist: {
    emergencyEquipment: {
      equipChecked: { type: Boolean, default: false },
      goBagChecked: { type: Boolean, default: false },
      infectionControlKit: { type: Boolean, default: false },
      o2TankChecked: { type: Boolean, default: false },
      carePlanChecked: { type: Boolean, default: false },
      alarmsOn: { type: Boolean, default: false },
      ambuBagOnSite: { type: Boolean, default: false },
      patientIdentified: { type: Boolean, default: false }
    },
    precautions: {
      safety: { type: Boolean, default: false },
      fall: { type: Boolean, default: false },
      aspiration: { type: Boolean, default: false },
      seizures: { type: Boolean, default: false }
    },
    observationType: {
      standard: { type: Boolean, default: false },
      vpShunt: { type: Boolean, default: false },
      respiration: { type: Boolean, default: false }
    }
  },
  
  // Vital Signs
  vitalSigns: {
    temperature: { type: String, default: '' },
    pulse: { type: String, default: '' },
    respiration: { type: String, default: '' },
    bloodPressure: { type: String, default: '' },
    oxygenSaturation: { type: String, default: '' }
  },
  
  // Neurological Assessment
  neurologicalAssessment: {
    status: {
      awake: { type: Boolean, default: false },
      oriented: { type: Boolean, default: false },
      asleep: { type: Boolean, default: false },
      alert: { type: Boolean, default: false },
      verbal: { type: Boolean, default: false },
      nonVerbal: { type: Boolean, default: false },
      vocalizes: { type: Boolean, default: false },
      developmentalDelay: { type: Boolean, default: false },
      cognitiveImpairment: { type: Boolean, default: false }
    },
    fontanels: {
      flat: { type: Boolean, default: false },
      soft: { type: Boolean, default: false },
      sunken: { type: Boolean, default: false },
      bulging: { type: Boolean, default: false },
      na: { type: Boolean, default: false }
    },
    reflexes: {
      suck: { type: Boolean, default: false },
      startle: { type: Boolean, default: false },
      gag: { type: Boolean, default: false },
      blink: { type: Boolean, default: false },
      grasp: { type: Boolean, default: false },
      na: { type: Boolean, default: false }
    },
    seizureActivity: {
      no: { type: Boolean, default: false },
      yes: { type: Boolean, default: false }
    }
  },
  
  // Head Assessment
  headAssessment: {
    pupils: {
      equal: { type: Boolean, default: false },
      reactive: { type: Boolean, default: false },
      nonReactive: { type: Boolean, default: false }
    },
    pupilSize: {
      right: { type: String, default: '' },
      left: { type: String, default: '' }
    },
    vision: {
      blindImpaired: { type: Boolean, default: false },
      glasses: { type: Boolean, default: false }
    },
    ears: {
      respondsToSound: { type: Boolean, default: false },
      deaf: { type: Boolean, default: false },
      drainage: { type: Boolean, default: false },
      aidsRequired: { type: Boolean, default: false }
    }
  },
  
  // Cardiovascular Assessment
  cardiovascularAssessment: {
    heartTones: {
      strong: { type: Boolean, default: false },
      regular: { type: Boolean, default: false },
      irregular: { type: Boolean, default: false },
      murmur: { type: Boolean, default: false }
    },
    hrParameters: {
      high: { type: String, default: '' },
      low: { type: String, default: '' }
    },
    peripheralPulses: {
      present: { type: Boolean, default: false },
      bounding: { type: Boolean, default: false },
      weak: { type: Boolean, default: false },
      thread: { type: Boolean, default: false },
      absent: { type: Boolean, default: false },
      lue: { type: Boolean, default: false },
      rue: { type: Boolean, default: false },
      lle: { type: Boolean, default: false },
      rle: { type: Boolean, default: false }
    },
    capillaryRefill: {
      brisk: { type: Boolean, default: false },
      sluggish: { type: Boolean, default: false }
    },
    edema: {
      edemaType: {
        none: { type: Boolean, default: false },
        yes: { type: Boolean, default: false },
        trace: { type: Boolean, default: false },
        plus1: { type: Boolean, default: false },
        plus2: { type: Boolean, default: false }
      },
      sites: { type: String, default: '' },
      comments: { type: String, default: '' }
    }
  },
  
  // Musculoskeletal Assessment
  musculoskeletalAssessment: {
    muscleTone: {
      hypertonic: { type: Boolean, default: false },
      hypotonic: { type: Boolean, default: false },
      normalTone: { type: Boolean, default: false }
    },
    rangeOfMotion: {
      fullROM: { type: Boolean, default: false },
      limitedROM: { type: Boolean, default: false },
      passive: { type: Boolean, default: false },
      active: { type: Boolean, default: false }
    },
    ambulatoryStatus: {
      ambulatory: { type: Boolean, default: false },
      nonAmbulatory: { type: Boolean, default: false },
      crawlsWalks: { type: Boolean, default: false },
      ambulatoryWithAssistance: { type: Boolean, default: false }
    }
  },
  
  // Respiratory Assessment
  respiratoryAssessment: {
    mechanicalAssist: {
      ventilator: { type: Boolean, default: false },
      cpap: { type: Boolean, default: false },
      bipap: { type: Boolean, default: false },
      vpap: { type: Boolean, default: false },
      na: { type: Boolean, default: false }
    },
    hoursPerDay: { type: String, default: '' },
    tracheostomy: {
      no: { type: Boolean, default: false },
      yes: { type: Boolean, default: false }
    },
    breathSounds: {
      clear: { type: Boolean, default: false },
      coarse: { type: Boolean, default: false },
      crackles: { type: Boolean, default: false },
      diminished: { type: Boolean, default: false }
    }
  },
  
  // Skin Condition
  skinCondition: {
    skinTemperature: {
      warm: { type: Boolean, default: false },
      cool: { type: Boolean, default: false },
      clammy: { type: Boolean, default: false },
      dry: { type: Boolean, default: false }
    },
    skinColor: {
      pink: { type: Boolean, default: false },
      pale: { type: Boolean, default: false },
      cyanotic: { type: Boolean, default: false },
      jaundiced: { type: Boolean, default: false }
    }
  },
  
  // Gastrointestinal Assessment
  gastrointestinalAssessment: {
    bowelContinence: {
      continent: { type: Boolean, default: false },
      incontinent: { type: Boolean, default: false }
    },
    lastBowelMovement: { type: String, default: '' },
    bowelSounds: {
      present: { type: Boolean, default: false },
      hyperactive: { type: Boolean, default: false },
      hypoactive: { type: Boolean, default: false },
      absent: { type: Boolean, default: false }
    }
  },
  
  // Genitourinary Assessment
  genitourinaryAssessment: {
    generalAssessment: {
      unremarkable: { type: Boolean, default: false },
      discharge: { type: Boolean, default: false },
      distention: { type: Boolean, default: false },
      maleCircumcised: { type: Boolean, default: false },
      strongOdor: { type: Boolean, default: false }
    },
    continence: {
      continent: { type: Boolean, default: false },
      incontinent: { type: Boolean, default: false },
      toiletTraining: { type: Boolean, default: false }
    }
  },
  
  // Pain Assessment
  painAssessment: {
    painPresence: {
      atRest: { type: Boolean, default: false },
      withActivity: { type: Boolean, default: false },
      na: { type: Boolean, default: false }
    },
    painLevel: { type: String, default: '' },
    duration: { type: String, default: '' },
    painDescription: {
      aching: { type: Boolean, default: false },
      burning: { type: Boolean, default: false },
      sharp: { type: Boolean, default: false },
      throbbing: { type: Boolean, default: false }
    }
  },
  
  // Intake & Output
  intakeOutput: {
    departureTime: { type: String, default: '' },
    arrivalTime: { type: String, default: '' },
    totalIntake: { type: String, default: '' },
    totalOutput: { type: String, default: '' }
  },
  
  // Additional fields for future expansion
  additionalNotes: { type: String, default: '' },
  
  // Status fields
  status: {
    type: String,
    enum: ['draft', 'completed', 'submitted'],
    default: 'draft'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// SIMPLE ENCRYPTION - Encrypt ALL string fields regardless of content
assessmentSchema.pre('save', function(next) {
  console.log('🔐 Starting encryption process...');
  
  const encryptField = (value) => {
    if (typeof value === 'string' && value !== '') {
      console.log(`Encrypting field: ${value.substring(0, 20)}...`);
      const encrypted = encrypt(value);
      console.log(`Encrypted to: ${encrypted.substring(0, 30)}...`);
      return encrypted;
    }
    return value;
  };

  const encryptObject = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    
    Object.keys(obj).forEach(key => {
      if (obj[key] !== null && typeof obj[key] === 'object') {
        // Recursively encrypt nested objects
        encryptObject(obj[key]);
      } else if (typeof obj[key] === 'string') {
        // Encrypt string fields
        obj[key] = encryptField(obj[key]);
      }
    });
  };

  try {
    // Encrypt all top-level objects that contain string fields
    const objectsToEncrypt = [
      'headerInfo',
      'vitalSigns',
      'neurologicalAssessment', 
      'headAssessment',
      'cardiovascularAssessment',
      'musculoskeletalAssessment',
      'respiratoryAssessment',
      'skinCondition',
      'gastrointestinalAssessment',
      'genitourinaryAssessment',
      'painAssessment',
      'intakeOutput'
    ];

    objectsToEncrypt.forEach(section => {
      if (this[section]) {
        console.log(`Encrypting section: ${section}`);
        encryptObject(this[section]);
      }
    });

    // Encrypt additionalNotes
    if (this.additionalNotes) {
      this.additionalNotes = encryptField(this.additionalNotes);
    }

    this.updatedAt = new Date();
    console.log('✅ Encryption completed');
    next();
  } catch (error) {
    console.error('❌ Encryption error:', error);
    next(error);
  }
});

// SIMPLE DECRYPTION - Decrypt ALL string fields that look encrypted
function decryptAssessmentData(doc) {
  if (!doc) return;
  
  console.log('🔓 Starting decryption process...');
  
  const decryptField = (value) => {
    if (typeof value !== 'string' || value === '') {
      return value;
    }
    
    // Try to decrypt everything that's a string
    try {
      console.log(`Attempting to decrypt: ${value.substring(0, 30)}...`);
      const decrypted = decrypt(value);
      console.log(`✅ Successfully decrypted to: ${decrypted.substring(0, 20)}...`);
      return decrypted;
    } catch (error) {
      // If decryption fails, it's probably not encrypted
      console.log(`❌ Decryption failed (probably not encrypted), returning original`);
      return value;
    }
  };

  const decryptObject = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    
    Object.keys(obj).forEach(key => {
      if (obj[key] !== null && typeof obj[key] === 'object') {
        // Recursively decrypt nested objects
        decryptObject(obj[key]);
      } else if (typeof obj[key] === 'string') {
        // Try to decrypt all string fields
        obj[key] = decryptField(obj[key]);
      }
    });
  };

  try {
    // Decrypt all top-level objects
    const objectsToDecrypt = [
      'headerInfo',
      'vitalSigns',
      'neurologicalAssessment',
      'headAssessment',
      'cardiovascularAssessment', 
      'musculoskeletalAssessment',
      'respiratoryAssessment',
      'skinCondition',
      'gastrointestinalAssessment',
      'genitourinaryAssessment',
      'painAssessment',
      'intakeOutput'
    ];

    objectsToDecrypt.forEach(section => {
      if (doc[section]) {
        console.log(`Decrypting section: ${section}`);
        decryptObject(doc[section]);
      }
    });

    // Decrypt additionalNotes
    if (doc.additionalNotes) {
      doc.additionalNotes = decryptField(doc.additionalNotes);
    }

    console.log('✅ Decryption completed');
  } catch (error) {
    console.error('❌ Decryption error:', error);
  }
}

// Apply decryption to ALL find operations
assessmentSchema.post('find', function(docs) {
  console.log('🔄 Post-find decryption hook triggered');
  if (docs && Array.isArray(docs)) {
    console.log(`Decrypting ${docs.length} documents`);
    docs.forEach((doc, index) => {
      if (doc) {
        console.log(`Decrypting document ${index + 1}`);
        decryptAssessmentData(doc);
      }
    });
  }
});

assessmentSchema.post('findOne', function(doc) {
  console.log('🔄 Post-findOne decryption hook triggered');
  if (doc) {
    decryptAssessmentData(doc);
  }
});

assessmentSchema.post('findById', function(doc) {
  console.log('🔄 Post-findById decryption hook triggered');
  if (doc) {
    decryptAssessmentData(doc);
  }
});

assessmentSchema.post('findOneAndUpdate', function(doc) {
  console.log('🔄 Post-findOneAndUpdate decryption hook triggered');
  if (doc) {
    decryptAssessmentData(doc);
  }
});

// Also handle exec() calls
assessmentSchema.post('exec', function(result) {
  console.log('🔄 Post-exec decryption hook triggered');
  if (Array.isArray(result)) {
    result.forEach(doc => {
      if (doc && typeof doc === 'object') {
        decryptAssessmentData(doc);
      }
    });
  } else if (result && typeof result === 'object') {
    decryptAssessmentData(result);
  }
  return result;
});

module.exports = mongoose.model('Assessment', assessmentSchema);