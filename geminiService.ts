import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Quiz, Mindmap, Summary, Language, FlashcardSet, VisualifyResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface SourceData {
  text?: string;
  image?: string; // base64
  url?: string;
}

function buildParts(prompt: string, source?: SourceData) {
  const parts: any[] = [{ text: prompt }];
  if (source?.text) parts.push({ text: `Source Text: ${source.text}` });
  if (source?.url) parts.push({ text: `Source URL: ${source.url}` });
  if (source?.image) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: source.image.split(',')[1] || source.image
      }
    });
  }
  return parts;
}

export async function generateVisualify(prompt: string, source?: SourceData, language: Language = 'english'): Promise<VisualifyResponse> {
  const systemInstruction = `You are an AI Visualify Engine designed to convert theoretical or abstract concepts into visual learning stories and animations.
  Your task is to transform a concept into an easy-to-understand visual explanation using storytelling, object animation, and real-world metaphors.
  Language: ${language}.

  Rules:
  - Use simple objects like fruits, boxes, water flow, traffic, or everyday scenes.
  - Ensure the visualization clearly represents the logic of the concept.
  - Make the animation intuitive so even beginners understand the concept quickly.
  - Avoid complex language; prioritize clarity and visual thinking.
  - Each step must correspond to a visible animation action.

  Return the result in strict JSON format matching the schema.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          metaphor: { type: Type.STRING },
          sceneDesign: { type: Type.STRING },
          animationFlow: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                step: { type: Type.NUMBER },
                action: { type: Type.STRING, description: "The visual action taking place" },
                description: { type: Type.STRING, description: "Explanation of what this step represents" }
              },
              required: ["step", "action", "description"]
            }
          },
          explanation: { type: Type.STRING },
          keyFacts: { type: Type.ARRAY, items: { type: Type.STRING } },
          realLifeApplication: { type: Type.STRING },
          styleSuggestions: { type: Type.STRING }
        },
        required: ["title", "metaphor", "sceneDesign", "animationFlow", "explanation", "keyFacts", "realLifeApplication", "styleSuggestions"]
      }
    },
    contents: [{
      role: 'user',
      parts: buildParts(`Concept to Visualify: ${prompt}`, source)
    }]
  });

  return JSON.parse(response.text);
}

export async function generateQuiz(prompt: string, source?: SourceData, isStoryMode: boolean = false, language: Language = 'english'): Promise<Quiz> {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `You are an expert educator. Your task is to generate a high-quality quiz based on the provided topic, text, image, or URL.
  Language: ${language}.
  ${isStoryMode ? "This is a STORY-BASED ADVENTURE. Create a narrative wrapper where the user is a character (explorer, farmer, inventor) and each question is a step in their journey. Use localized contexts if applicable." : ""}
  The quiz MUST have at least 5 questions (up to 10).
  Ensure that all questions are unique and do not repeat.
  Each question must have exactly 4 options.
  One option must be correct.
  Provide a clear explanation for why the answer is correct.
  Assign points (100-1000) based on difficulty.
  Assign a time limit (10-30 seconds) based on complexity.
  If a URL is provided, try to extract information from it. If an image is provided, analyze the handwritten notes or diagrams.
  Return the result in strict JSON format.`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: buildParts(`Generate a quiz about: ${prompt}`, source) }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          narrative: { type: Type.STRING },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.STRING },
                explanation: { type: Type.STRING },
                points: { type: Type.NUMBER },
                timeLimit: { type: Type.NUMBER }
              },
              required: ["id", "question", "options", "correctAnswer", "explanation", "points", "timeLimit"]
            }
          }
        },
        required: ["title", "description", "questions"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function generateMindmap(prompt: string, source?: SourceData, language: Language = 'english'): Promise<Mindmap> {
  const systemInstruction = `You are an intelligent Mind Map Generator.
  Your task is to convert any topic or study content into a clear, structured, and visually balanced mind map.
  Language: ${language}.

  Requirements:
  1. Identify the MAIN TOPIC and place it as the central node.
  2. Break the topic into 4–8 MAIN BRANCHES representing key concepts.
  3. Each main branch should contain 3–6 SUBTOPICS that explain the idea in short, clear keywords.
  4. If necessary, add a third level of nodes for examples, formulas, definitions, or applications.
  5. Use short phrases instead of long sentences.
  6. Organize the mind map logically: Definitions, Key concepts, Processes, Examples, Applications, Important facts.
  7. Ensure the structure is Hierarchical, Easy to scan, and Balanced across branches.
  8. For better visualization, include icons or emojis representing the concept in the labels.
  9. Avoid repeating information.
  10. Include "Deep Learning" elements: examples, formulas, real-life applications, and memory tricks (mnemonics) where relevant.

  Return the result in strict JSON format matching the schema.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          root: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              label: { type: Type.STRING },
              description: { type: Type.STRING },
              children: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    label: { type: Type.STRING },
                    description: { type: Type.STRING },
                    color: { type: Type.STRING, description: "Suggest a vibrant hex color for this branch" },
                    children: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          label: { type: Type.STRING },
                          description: { type: Type.STRING }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    contents: [{
      role: 'user',
      parts: buildParts(`Generate a conceptual mindmap for: ${prompt}`, source)
    }]
  });

  return JSON.parse(response.text);
}

export async function generateFlashcards(prompt: string, source?: SourceData, language: Language = 'english'): Promise<FlashcardSet> {
  const systemInstruction = `Act as an expert study assistant.
  Create clear and concise flashcards from the topic provided.
  Language: ${language}.

  Instructions:
  - Each flashcard should have a Question (Front) and Answer (Back).
  - Keep answers short, accurate, and easy to memorize.
  - Focus on key concepts, definitions, and important facts.
  - Avoid long paragraphs.
  - Generate 10–15 flashcards.
  - Style: Anki-style flashcards.
  - Optional: Include examples or mnemonics if helpful.

  Return the result in strict JSON format matching the schema.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          cards: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                front: { type: Type.STRING, description: "Question (Front side)" },
                back: { type: Type.STRING, description: "Answer (Back side)" },
                mnemonic: { type: Type.STRING, description: "Optional memory aid or mnemonic" }
              },
              required: ["id", "front", "back"]
            }
          }
        },
        required: ["title", "cards"]
      }
    },
    contents: [{
      role: 'user',
      parts: buildParts(`Topic/Text:\n${prompt}`, source)
    }]
  });

  return JSON.parse(response.text);
}

export async function generateSummary(prompt: string, source?: SourceData, language: Language = 'english'): Promise<Summary> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: { type: Type.STRING },
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    },
    contents: [{
      role: 'user',
      parts: buildParts(`Generate a concise summary for: ${prompt}. Language: ${language}.`, source)
    }]
  });

  return JSON.parse(response.text);
}

export async function chatWithAI(message: string, context?: string, language: Language = 'english'): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{
      role: 'user',
      parts: [{
        text: `You are a 24/7 learning assistant for QuizQuest AI. 
        Language: ${language}.
        Context: ${context || 'General learning support'}.
        User message: ${message}`
      }]
    }]
  });

  return response.text;
}

export async function textToSpeech(text: string): Promise<string> {
  try {
    // Sanitize text: remove markdown and extra whitespace
    const sanitizedText = text
      .replace(/#+\s/g, '') // Headers
      .replace(/\*\*/g, '') // Bold
      .replace(/\*/g, '') // Italic
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Links
      .replace(/`{1,3}.*?`{1,3}/gs, '') // Code blocks
      .replace(/>\s/g, '') // Blockquotes
      .replace(/-\s/g, '') // List items
      .replace(/\n+/g, ' ') // Newlines to spaces
      .trim();

    if (!sanitizedText || sanitizedText.length < 2) {
      throw new Error("Text is too short for speech generation");
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: sanitizedText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Failed to generate audio");

    // Gemini TTS returns raw 16-bit PCM at 24kHz. We need to add a WAV header.
    const pcmData = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));
    const sampleRate = 24000;
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + pcmData.length, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, pcmData.length, true);

    const wav = new Uint8Array(header.byteLength + pcmData.length);
    wav.set(new Uint8Array(header), 0);
    wav.set(pcmData, header.byteLength);

    let binary = '';
    for (let i = 0; i < wav.length; i++) {
      binary += String.fromCharCode(wav[i]);
    }
    const base64Wav = btoa(binary);

    return `data:audio/wav;base64,${base64Wav}`;
  } catch (err: any) {
    if (err.message?.includes('quota') || err.message?.includes('429')) {
      throw new Error("QUOTA_EXCEEDED: You have exceeded your Gemini API quota. Falling back to browser speech.");
    }
    if (err.message?.includes('AudioOut model') || err.message?.includes('non-audio response')) {
      throw new Error("INVALID_PROMPT: The AI model could not process this text for speech. Falling back to browser speech.");
    }
    console.error("TTS error:", err);
    if (err.message?.includes('permission') || err.message?.includes('403')) {
      throw new Error("PERMISSION_DENIED: Your API key does not have permission for Text-to-Speech. Please ensure you are using a valid Gemini API key.");
    }
    throw err;
  }
}

export async function generateVideo(prompt: string): Promise<string> {
  // Create a new instance right before the call to use the latest API key
  const videoAi = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY || "" });
  
  let operation;
  try {
    operation = await videoAi.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });
  } catch (err: any) {
    console.error("Video generation start failed:", err);
    if (err.message?.includes('permission') || err.message?.includes('403')) {
      throw new Error("PERMISSION_DENIED: Your API key does not have permission for video generation. Please ensure you are using a paid Gemini API key with billing enabled.");
    }
    throw err;
  }

  // Poll for completion
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await videoAi.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation failed - no download link");

  // Fetch the video with the API key in headers
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
  const response = await fetch(downloadLink, {
    method: 'GET',
    headers: {
      'x-goog-api-key': apiKey,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Video download failed:", errorBody);
    throw new Error(`Failed to download generated video: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
