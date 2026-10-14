import type { StoryConfigPayload } from '../types/storyConfig';
import type { StoryData, GeneratedStoryOutput } from '../types/reading';
import {
  generateStoryPrompt,
  buildStoryPrompt,
  parseGeneratedStoryJson,
  type PromptTemplateOptions,
} from '../utils/promptTemplates';
import {
  generateStoryFromConfig,
  generateStoryJson,
  buildStructuredStoryOutput,
} from '../utils/mockStoryGenerator';

export {
  generateStoryPrompt,
  buildStoryPrompt,
  parseGeneratedStoryJson,
  generateStoryFromConfig,
  generateStoryJson,
  buildStructuredStoryOutput,
};

export interface StoryGeneratorService {
  createPrompt: (options: PromptTemplateOptions) => string;
  generateStory: (payload: StoryConfigPayload) => Promise<StoryData>;
  generateMockStory: (payload: StoryConfigPayload) => StoryData;
  parseStoryOutput: (jsonString: string) => GeneratedStoryOutput;
}

/**
 * Story Generator Service coordinating prompt construction and story generation (Mock or LLM).
 */
export const storyGeneratorService: StoryGeneratorService = {
  createPrompt: (options) => buildStoryPrompt(options),

  generateMockStory: (payload: StoryConfigPayload): StoryData => {
    return generateStoryFromConfig(payload);
  },

  generateStory: async (payload: StoryConfigPayload): Promise<StoryData> => {
    // Currently executes mock generator synchronously wrapped in Promise
    // In future iterations, an external LLM endpoint can be invoked here.
    return Promise.resolve(generateStoryFromConfig(payload));
  },

  parseStoryOutput: (jsonString: string): GeneratedStoryOutput => {
    return parseGeneratedStoryJson(jsonString);
  },
};
