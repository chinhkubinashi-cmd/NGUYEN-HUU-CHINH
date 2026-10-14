import { StoryProject } from '../types';

const SHARE_PREFIX = 'VANSI:v1:';

/**
 * Encodes a story project into a shareable string code.
 * Uses UTF-8 safe Base64 encoding.
 */
export function encodeShareCode(project: StoryProject): string {
  try {
    const jsonStr = JSON.stringify(project);
    // Encode UTF-8 characters safely for Base64
    const utf8Bytes = encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    });
    const base64 = btoa(utf8Bytes);
    return `${SHARE_PREFIX}${base64}`;
  } catch (error) {
    console.error('Failed to encode share code:', error);
    // Fallback to raw formatted JSON if Base64 fails for any reason
    return JSON.stringify(project, null, 2);
  }
}

/**
 * Decodes a share code (or raw JSON string) into a StoryProject.
 * Throws an error if invalid.
 */
export function decodeShareCode(codeStr: string): StoryProject {
  const trimmed = codeStr.trim();
  if (!trimmed) {
    throw new Error('Mã chia sẻ không được để trống.');
  }

  let jsonStr = '';

  if (trimmed.startsWith(SHARE_PREFIX)) {
    const base64 = trimmed.slice(SHARE_PREFIX.length).trim();
    const binary = atob(base64);
    // Decode URI component bytes back to UTF-8
    jsonStr = decodeURIComponent(
      Array.prototype.map.call(binary, (ch: string) => {
        return '%' + ('00' + ch.charCodeAt(0).toString(16)).slice(-2);
      }).join('')
    );
  } else if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    jsonStr = trimmed;
  } else {
    // Try base64 directly
    try {
      const binary = atob(trimmed);
      jsonStr = decodeURIComponent(
        Array.prototype.map.call(binary, (ch: string) => {
          return '%' + ('00' + ch.charCodeAt(0).toString(16)).slice(-2);
        }).join('')
      );
    } catch {
      throw new Error('Mã chia sẻ không đúng định dạng. Vui lòng kiểm tra lại.');
    }
  }

  const parsed = JSON.parse(jsonStr);

  if (!parsed || typeof parsed !== 'object' || !parsed.title) {
    throw new Error('Dữ liệu không phải là một tác phẩm hợp lệ.');
  }

  // Normalize project structure
  const normalized: StoryProject = {
    id: parsed.id || Date.now().toString(),
    title: parsed.title || 'Tác phẩm không tên',
    premise: parsed.premise || '',
    setting: parsed.setting || 'Việt Nam hiện đại',
    characters: Array.isArray(parsed.characters) ? parsed.characters : [],
    outline: Array.isArray(parsed.outline) ? parsed.outline : [],
    chapters: Array.isArray(parsed.chapters) ? parsed.chapters : [],
    createdAt: typeof parsed.createdAt === 'number' ? parsed.createdAt : Date.now(),
    status: parsed.status === 'completed' ? 'completed' : 'in_progress',
    updatedAt: Date.now()
  };

  return normalized;
}

/**
 * Downloads a single project as a JSON file.
 */
export function exportSingleProject(project: StoryProject): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
  const downloadAnchor = document.createElement('a');
  const safeTitle = (project.title || 'truyen')
    .toLowerCase()
    .replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, '_')
    .slice(0, 40);
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `${safeTitle}_vansi_du_an.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Checks if all chapters have written content.
 */
export function checkIsAllChaptersWritten(project: StoryProject): boolean {
  if (!project.chapters || project.chapters.length === 0) return false;
  return project.chapters.every(ch => Boolean(ch.content && ch.content.trim().length > 100));
}
