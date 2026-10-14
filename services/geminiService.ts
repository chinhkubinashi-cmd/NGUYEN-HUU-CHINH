
import { GoogleGenAI, Type } from "@google/genai";
import { StoryProject, Character, Chapter } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_INSTRUCTION = `Bạn là một nhà văn chuyên viết truyện dài thể loại Đời thường (Slice of Life) và Tâm lý xã hội tại Việt Nam cho kênh YouTube 'Nghe & Ngẫm'.

QUY TẮC CỐT LÕI:
1. NGÔN NGỮ: Sử dụng tiếng Việt thuần túy, giàu hình ảnh, chau chuốt nhưng gãy gọn. Linh hoạt dùng từ láy và thành ngữ phù hợp bối cảnh Việt Nam. Tuyệt đối không dùng văn phong báo chí hay từ lóng hiện đại (trừ khi đối thoại nhân vật trẻ).
2. TÂM LÝ (SHOW, DON'T TELL): Không chỉ kể sự việc, hãy vẽ ra tâm trạng thông qua cử chỉ, ánh mắt, hơi thở và không gian xung quanh. Tập trung vào những rung động nhỏ nhất của tâm hồn.
3. NHỊP ĐIỆU: Chậm rãi, từ tốn, tạo những khoảng lặng để thính giả audio có thời gian ngấm và suy ngẫm.
4. TÍNH CHÂN THỰC: Bối cảnh gia đình, xóm làng, công sở Việt Nam phải logic. Tránh kịch tính hóa (drama) quá đà kiểu rẻ tiền.
5. NHÂN VĂN: Hướng tới sự đồng cảm, chữa lành và những giá trị đạo đức cao đẹp của người Việt.
6. TỐI ƯU CHO AUDIO TTS: Tuyệt đối KHÔNG sử dụng các từ tượng thanh mô tả âm thanh trực tiếp (ví dụ: "Khụ... khụ...", "Lách cách...", "Rầm...", "Cạch..."). Vì truyện sẽ được đọc bằng AI (TTS), các từ này khi phát âm sẽ rất thiếu tự nhiên. Thay vào đó, hãy miêu tả âm thanh bằng câu văn trần thuật (ví dụ: "Tiếng ho khô khốc vang lên", "Ổ khóa mở ra với một tiếng động khô khốc").`;

export const generateStoryIdea = async (prompt: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: `Hãy gợi ý 3 ý tưởng truyện dài sâu sắc dựa trên yêu cầu: ${prompt}. Mỗi ý tưởng gồm: Tiêu đề, Tóm tắt cốt truyện (Focus vào tâm lý), và Thông điệp nhân văn.
    
    Trả về kết quả dưới dạng mảng JSON, mỗi phần tử là một object có cấu trúc:
    {
      "title": "Tiêu đề truyện",
      "premise": "Tóm tắt cốt truyện",
      "message": "Thông điệp nhân văn"
    }
    Chỉ trả về JSON, không kèm text nào khác.`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.8,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            premise: { type: Type.STRING },
            message: { type: Type.STRING }
          },
          required: ["title", "premise", "message"]
        }
      }
    },
  });
  return response.text;
};

export const generateOutline = async (title: string, premise: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: `Lập dàn ý chi tiết cho truyện "${title}" với cốt truyện: ${premise}. Chia thành 10-12 chương. 
    
    YÊU CẦU QUAN TRỌNG:
    - Các chương đầu và giữa phải xây dựng các "drama" hoặc plot twist để câu chuyện cuốn hút, giữ chân người nghe.
    - Từng drama hay plot twist phải được móc nối, liên quan chặt chẽ đến nhau.
    - Về dần những chương cuối, phải tháo gỡ dần những nút thắt, plot twist hay drama trước đó một cách logic và thỏa đáng.
    - Mỗi chương phải có một sắc thái cảm xúc (emotionalTone) phù hợp với diễn biến (chọn 1 trong: U sầu, Bình thản, Chữa lành, Hoài niệm, Kịch tính ngầm, Căng thẳng, Hy vọng). Đảm bảo sự thay đổi cảm xúc hợp lý qua từng giai đoạn của truyện.
    - Liệt kê danh sách các nhân vật chính xuất hiện trong truyện.
    
    Trả về kết quả dưới dạng JSON object có cấu trúc:
    {
      "chapters": [
        {
          "title": "Tên chương",
          "summary": "Dàn ý chi tiết của chương. BẮT BUỘC dùng gạch đầu dòng markdown...",
          "emotionalTone": "Sắc thái cảm xúc chính (Ví dụ: Chữa lành)"
        }
      ],
      "characters": [
        {
          "name": "Tên nhân vật",
          "role": "Vai trò (VD: Nhân vật chính, Phản diện...)",
          "personality": "Tính cách",
          "pastPain": "Nỗi đau quá khứ",
          "currentDesire": "Mong muốn hiện tại",
          "internalConflict": "Xung đột nội tâm"
        }
      ]
    }
    Chỉ trả về JSON, không kèm text nào khác.`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          chapters: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                emotionalTone: { type: Type.STRING }
              },
              required: ["title", "summary", "emotionalTone"]
            }
          },
          characters: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                role: { type: Type.STRING },
                personality: { type: Type.STRING },
                pastPain: { type: Type.STRING },
                currentDesire: { type: Type.STRING },
                internalConflict: { type: Type.STRING }
              },
              required: ["name", "role", "personality", "pastPain", "currentDesire", "internalConflict"]
            }
          }
        },
        required: ["chapters", "characters"]
      }
    },
  });
  return response.text;
};

export const generateNextChapterOutline = async (project: StoryProject) => {
  const existingChaptersContext = project.chapters
    .map((c, i) => `Chương ${i + 1}: ${c.title}\nTóm tắt: ${c.summary}\n`)
    .join('\n');

  const prompt = `
    Dựa trên tác phẩm:
    Tên truyện: ${project.title}
    Cốt truyện: ${project.premise}

    CÁC CHƯƠNG ĐÃ CÓ:
    ${existingChaptersContext}

    NHIỆM VỤ:
    Hãy sáng tạo nội dung cho CHƯƠNG ${project.chapters.length + 1} tiếp nối mạch cảm xúc trên.
    Trả về kết quả dưới dạng JSON object có cấu trúc:
    {
      "title": "Tên chương đầy chất thơ",
      "summary": "Dàn ý chi tiết của chương. BẮT BUỘC dùng gạch đầu dòng markdown. Ví dụ:\n- **Bối cảnh/Sự kiện:** ...\n- **Biến cố/Drama:** ...\n- **Chuyển biến nội tâm:** ...",
      "emotionalTone": "Sắc thái cảm xúc chính (chọn 1 trong: U sầu, Bình thản, Chữa lành, Hoài niệm, Kịch tính ngầm, Căng thẳng, Hy vọng)"
    }
    Chỉ trả về JSON, không kèm text nào khác.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          emotionalTone: { type: Type.STRING }
        },
        required: ["title", "summary", "emotionalTone"]
      }
    },
  });
  return response.text;
};

export const writeChapterContent = async (
  project: StoryProject,
  chapterIndex: number,
  additionalContext: string = "",
  onStreamChunk?: (accumulatedText: string) => void,
  abortSignal?: AbortSignal
) => {
  const chapter = project.chapters[chapterIndex];
  const charContext = project.characters.map(c => 
    `- ${c.name}: ${c.role}. Tính cách: ${c.personality}. Nỗi đau: ${c.pastPain}. Khao khát: ${c.currentDesire}.`
  ).join("\n");
  
  const previousChapters = project.chapters.slice(0, chapterIndex).map(c => `- Chương ${project.chapters.indexOf(c) + 1}: ${c.title}\n  Tóm tắt: ${c.summary}`).join('\n\n');
  
  const prompt = `
    VIẾT CHI TIẾT CHƯƠNG ${chapterIndex + 1}: "${chapter.title}"
    
    DÀN Ý CHI TIẾT CỦA CHƯƠNG NÀY (BẮT BUỘC TUÂN THỦ NGHIÊM NGẶT):
    ${chapter.summary}
    
    Sắc thái cảm xúc chủ đạo: ${chapter.emotionalTone || 'Không xác định'}
    
    Bối cảnh chung: ${project.setting}
    
    Hồ sơ tâm lý nhân vật:
    ${charContext}
    
    ${previousChapters ? `TÓM TẮT CÁC CHƯƠNG TRƯỚC (Để kết nối mạch truyện, giải quyết các drama/plot twist đã gieo):\n${previousChapters}\n` : ""}
    
    YÊU CẦU BÚT PHÁP & NỘI DUNG: 
    - Triển khai ĐẦY ĐỦ các ý trong Dàn ý chi tiết ở trên thành một chương truyện hoàn chỉnh. Không bỏ sót bất kỳ tình tiết hay drama nào đã được lên khung.
    - Viết khoảng 1500-2000 từ.
    - Áp dụng triệt để "Show, Don't Tell". Miêu tả sự vật để nói về sự người.
    - Đối thoại tự nhiên, mang hơi thở đời sống Việt.
    - Tập trung vào mâu thuẫn giữa nỗi đau quá khứ và khao khát hiện tại.
    - Nếu đây là những chương cuối, hãy chú ý tháo gỡ các nút thắt, drama từ các chương trước một cách logic và cảm xúc.
    - Tuyệt đối KHÔNG dùng từ tượng thanh mô tả âm thanh (như "Khụ khụ", "Lách cách") để tối ưu cho giọng đọc AI (TTS).
    ${additionalContext ? `Lưu ý đặc biệt: ${additionalContext}` : ""}
  `;

  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.8,
        thinkingConfig: { thinkingBudget: 6000 }
      },
    });

    let fullText = '';
    for await (const chunk of stream) {
      if (abortSignal?.aborted) {
        break;
      }
      if (chunk.text) {
        fullText += chunk.text;
        if (onStreamChunk) {
          onStreamChunk(fullText);
        }
      }
    }
    return fullText;
  } catch (error: any) {
    if (abortSignal?.aborted) {
      return '';
    }
    // Fallback to standard generateContent if stream fails
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.8,
        thinkingConfig: { thinkingBudget: 6000 }
      },
    });
    return response.text || '';
  }
};

export const continueChapterContent = async (
  project: StoryProject,
  chapterIndex: number,
  existingContent: string,
  additionalContext: string = "",
  onStreamChunk?: (newChunk: string, fullCombinedText: string) => void,
  abortSignal?: AbortSignal
): Promise<string> => {
  const chapter = project.chapters[chapterIndex];
  const charContext = project.characters.map(c => 
    `- ${c.name}: ${c.role}. Tính cách: ${c.personality}. Nỗi đau: ${c.pastPain}. Khao khát: ${c.currentDesire}.`
  ).join("\n");
  
  const previousChapters = project.chapters.slice(0, chapterIndex).map(c => `- Chương ${project.chapters.indexOf(c) + 1}: ${c.title}\n  Tóm tắt: ${c.summary}`).join('\n\n');

  const trimmed = existingContent.trimEnd();
  // Format separator appropriately
  const separator = /[\.\!\?…\"\”\']$/.test(trimmed) ? '\n\n' : ' ';

  const prompt = `
    BẠN ĐANG THỰC HIỆN NHIỆM VỤ: TIẾP TỤC SÁNG TÁC CHO CHƯƠNG ĐANG VIẾT DỞ.
    Chương ${chapterIndex + 1}: "${chapter.title}"
    Tác phẩm: "${project.title}"

    TÌNH HUỐNG:
    Chương truyện này đang được viết nhưng bị dừng lại giữa chừng (do mất mạng, tạm dừng hoặc tài khoản hết quota).
    Nhiệm vụ của bạn là VIẾT TIẾP TỤC từ điểm dừng của đoạn văn đã có dưới đây để hoàn thiện nốt chương một cách trọn vẹn, không viết lại từ đầu.

    DÀN Ý TOÀN BỘ CHƯƠNG (HÃY ĐỐI CHIẾU VỚI ĐOẠN ĐÃ VIẾT ĐỂ NHẬN BIẾT NHỮNG Ý CÒN THIẾU VÀ TRIỂN KHAI TIẾP):
    ${chapter.summary}
    
    Sắc thái cảm xúc chủ đạo: ${chapter.emotionalTone || 'Không xác định'}
    Bối cảnh truyện: ${project.setting}
    
    Hồ sơ nhân vật:
    ${charContext}
    
    ${previousChapters ? `Tóm tắt các chương trước:\n${previousChapters}\n` : ""}

    =========================================
    NỘI DUNG ĐÃ VIẾT ĐẾN THỜI ĐIỂM HIỆN TẠI:
    ${existingContent}
    =========================================

    QUY TẮC BẮT BUỘC KHI TIẾP TỤC SÁNG TÁC:
    1. BẮT ĐẦU NGAY LẬP TỨC: Viết tiếp nối liền mạch từ dấu mốc kết thúc của đoạn văn trên. KHÔNG lặp lại các câu chữ đã có. KHÔNG viết lời chào, lời dẫn hay tiêu đề phụ (như "Tiếp tục chương:", "Đoạn tiếp theo:...").
    2. NỐI MẠCH MƯỢT MÀ: Nếu câu cuối cùng của đoạn đã viết đang dang dở, hãy hoàn thiện câu đó rồi tiếp tục. Nếu đã kết thúc một đoạn, hãy mở ra diễn biến hoặc suy nghĩ tiếp theo một cách tự nhiên.
    3. TRIỂN KHAI HẾT CÁC Ý CÒN LẠI TRONG DÀN Ý: Đọc lại dàn ý chương ở trên, nhận diện các nút thắt, drama, tình huống hoặc biến chuyển cảm xúc chưa được viết để triển khai cho đến khi chương kết thúc trọn vẹn.
    4. BÚT PHÁP: Giàu hình ảnh, tâm lý sâu lắng ("Show, Don't Tell"), đối thoại tự nhiên mang đậm hơi thở cuộc sống Việt Nam.
    5. TỐI ƯU CHO AUDIO TTS: Tuyệt đối KHÔNG sử dụng các từ tượng thanh mô tả âm thanh (như "Khụ khụ", "Lách cách", "Rầm rầm", "Cạch"). Hãy dùng câu văn trần thuật miêu tả âm thanh.
    6. DUNG LƯỢNG: Viết tiếp từ 800 - 1500 từ (hoặc đủ dung lượng để hoàn tất chương một cách sâu sắc).
    ${additionalContext ? `Lưu ý thêm từ người dùng: ${additionalContext}` : ""}
  `;

  let newAccumulatedText = '';
  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.8,
        thinkingConfig: { thinkingBudget: 6000 }
      },
    });

    for await (const chunk of stream) {
      if (abortSignal?.aborted) {
        break;
      }
      if (chunk.text) {
        newAccumulatedText += chunk.text;
        const currentCombined = trimmed + separator + newAccumulatedText.trimStart();
        if (onStreamChunk) {
          onStreamChunk(newAccumulatedText, currentCombined);
        }
      }
    }
    return trimmed + separator + newAccumulatedText.trimStart();
  } catch (error: any) {
    if (abortSignal?.aborted && newAccumulatedText) {
      return trimmed + separator + newAccumulatedText.trimStart();
    }
    // Fallback if stream fails on initial call
    if (!newAccumulatedText) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.8,
          thinkingConfig: { thinkingBudget: 6000 }
        },
      });
      const generatedText = (response.text || '').trim();
      return trimmed + separator + generatedText;
    }
    return trimmed + separator + newAccumulatedText.trimStart();
  }
};

export const critiqueChapterOutline = async (project: StoryProject, chapterIndex: number) => {
  const chapter = project.chapters[chapterIndex];
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: `Bạn là một biên tập viên văn học. Hãy phê bình dàn ý chương sau đây của truyện "${project.title}":
    
    Chương ${chapterIndex + 1}: ${chapter.title}
    Dàn ý:
    ${chapter.summary}
    
    Hãy đưa ra nhận xét:
    1. Điểm mạnh của dàn ý này.
    2. Điểm yếu (có bị nhàm chán, thiếu logic, hay thiếu chiều sâu nội tâm không?).
    3. Đề xuất cụ thể để cải thiện (thêm chi tiết, đổi góc nhìn, v.v.).
    
    Trả về kết quả ngắn gọn, súc tích bằng tiếng Việt.`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.6,
    },
  });
  return response.text;
};

export const addDramaToChapterOutline = async (project: StoryProject, chapterIndex: number) => {
  const chapter = project.chapters[chapterIndex];
  const previousChapters = project.chapters.slice(0, chapterIndex).map(c => `- ${c.title}: ${c.summary}`).join('\n');
  const nextChapters = project.chapters.slice(chapterIndex + 1).map(c => `- ${c.title}: ${c.summary}`).join('\n');
  
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: `Dựa trên dàn ý hiện tại của chương ${chapterIndex + 1} trong truyện "${project.title}":
    
    Tên chương: ${chapter.title}
    Dàn ý cũ:
    ${chapter.summary}
    
    Các chương trước đó (để kết nối logic):
    ${previousChapters}
    
    Các chương sau đó (nếu có):
    ${nextChapters}
    
    YÊU CẦU:
    Hãy viết lại dàn ý này, thêm vào một "drama" (biến cố, xung đột, plot twist) để câu chuyện cuốn hút hơn, giữ chân người nghe, nhưng KHÔNG làm mất đi tính chân thực của thể loại Đời thường.
    Drama này phải móc nối chặt chẽ với các chương trước (nếu có) và tạo tiền đề để tháo gỡ ở các chương sau. Không tạo drama rời rạc.
    Đồng thời, hãy cập nhật lại sắc thái cảm xúc (emotionalTone) cho phù hợp với drama mới thêm vào.
    
    Trả về kết quả dưới dạng JSON object có cấu trúc:
    {
      "summary": "Dàn ý mới (dùng gạch đầu dòng markdown, giữ nguyên cấu trúc chi tiết)",
      "emotionalTone": "Sắc thái cảm xúc mới (chọn 1 trong: U sầu, Bình thản, Chữa lành, Hoài niệm, Kịch tính ngầm, Căng thẳng, Hy vọng)"
    }
    Chỉ trả về JSON, không kèm lời giải thích.`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.8,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          emotionalTone: { type: Type.STRING }
        },
        required: ["summary", "emotionalTone"]
      }
    },
  });
  return response.text;
};

export const critiqueWriting = async (content: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: `Với tư cách là một biên tập viên văn học khó tính, hãy nhận xét đoạn văn sau về:
    1. Độ sâu sắc của nội tâm (Đã Show thay vì Tell chưa?)
    2. Nhịp điệu và từ ngữ (Có giàu hình ảnh và chất thơ không?)
    3. Tính logic đời sống Việt Nam.
    Đoạn văn: ${content}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.5,
    },
  });
  return response.text;
};

export const rewriteChapter = async (
  project: StoryProject,
  chapterIndex: number,
  currentContent: string,
  critique: string
) => {
  const chapter = project.chapters[chapterIndex];
  const charContext = project.characters.map(c => 
    `- ${c.name}: ${c.role}. Tính cách: ${c.personality}. Nỗi đau: ${c.pastPain}. Khao khát: ${c.currentDesire}.`
  ).join("\n");

  const prompt = `
    Bạn là một nhà văn đang chỉnh sửa bản thảo dựa trên góp ý của biên tập viên.
    
    BỐI CẢNH & NHÂN VẬT:
    ${charContext}

    DÀN Ý CHI TIẾT CỦA CHƯƠNG NÀY (BẮT BUỘC TUÂN THỦ NGHIÊM NGẶT):
    ${chapter.summary}

    NỘI DUNG GỐC (CHƯƠNG ${chapterIndex + 1}: ${chapter.title}):
    ${currentContent}

    GÓP Ý CỦA BIÊN TẬP VIÊN:
    ${critique}

    NHIỆM VỤ:
    Hãy viết lại chương này, áp dụng triệt để các góp ý trên để nâng cao chất lượng văn học. 
    Giữ nguyên cốt truyện gốc và các điểm chính trong dàn ý, chỉ thay đổi cách diễn đạt, miêu tả tâm lý và nhịp điệu theo hướng dẫn.
    Đảm bảo văn phong sâu lắng, giàu hình ảnh (Show, Don't Tell) theo đúng phong cách của kênh 'Nghe & Ngẫm'.
    Tuyệt đối KHÔNG dùng từ tượng thanh mô tả âm thanh (như "Khụ khụ", "Lách cách") để tối ưu cho giọng đọc AI (TTS).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
      thinkingConfig: { thinkingBudget: 4000 }
    },
  });
  return response.text;
};
