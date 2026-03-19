import { tool } from 'ai';
import { z } from 'zod';

import { Sandbox } from './sandbox';
import { stripFrontmatter, type SkillMetadata } from './loader';

/**
 * Tool to load a skill's instructions.
 */
const loadSkill = tool({
  description:
    "Load a skill to get specialized instructions. Use when the user's request matches a skill description.",
  inputSchema: z.object({
    name: z.string().describe('The skill name to load'),
  }),
  strict: true,
  execute: async ({ name }, { experimental_context }) => {
    const { sandbox, skills } = experimental_context as {
      sandbox: Sandbox;
      skills: SkillMetadata[];
    };
    const skill = skills.find(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    );
    if (!skill) {
      return { error: `Skill '${name}' not found` };
    }

    const skillFile = `${skill.path}/SKILL.md`;
    const content = await sandbox.readFile(skillFile, 'utf-8');
    const body = stripFrontmatter(content);

    return {
      skillName: skill.name,
      skillDirectory: skill.path,
      content: body,
    };
  },
});

/**
 * Tool to read a file from the filesystem.
 */
const readFile = tool({
  description: 'Read a file from the filesystem',
  inputSchema: z.object({
    path: z.string().describe('The path to the file to read'),
  }),
  strict: true,
  execute: async ({ path }, { experimental_context }) => {
    const { sandbox } = experimental_context as { sandbox: Sandbox };
    return sandbox.readFile(path, 'utf-8');
  },
});

/**
 * Tool to execute a script bundled with a skill.
 */
const executeSkillScript = tool({
  description:
    'Execute a JavaScript script bundled with a skill inside a sandboxed environment. Provide the skill name and relative script path (e.g. "scripts/transform.js").',
  inputSchema: z.object({
    skillName: z.string().describe('The skill name that owns the script'),
    scriptPath: z
      .string()
      .describe('Relative path to the script within the skill directory'),
    context: z
      .record(z.string(), z.any())
      .optional()
      .describe(
        'Optional key-value context to inject into the script scope (e.g. { inputData: [...] })'
      ),
  }),
  strict: true,
  execute: async (
    { skillName, scriptPath, context },
    { experimental_context }
  ) => {
    const { skills, sandbox } = experimental_context as {
      skills: SkillMetadata[];
      sandbox: Sandbox;
    };
    const skill = skills.find(
      (s) => s.name.toLowerCase() === skillName.toLowerCase()
    );
    if (!skill) {
      return { error: `Skill '${skillName}' not found` };
    }

    try {
      const scriptFile = `${skill.path}/${scriptPath}`;
      const code = await sandbox.readFile(scriptFile, 'utf-8');
      const result = await sandbox.execScript(code, context || {});
      return result;
    } catch (err: any) {
      return { error: err.message || String(err) };
    }
  },
});

/**
 * Tool to execute a bash command inside a sandboxed environment.
 */
const execBash = tool({
  description: 'Execute a bash command inside a sandboxed environment',
  inputSchema: z.object({
    command: z.string().describe('The bash command to execute'),
  }),
  strict: true,
  execute: async ({ command }, { experimental_context }) => {
    const { sandbox } = experimental_context as { sandbox: Sandbox };
    return sandbox.execBash(command);
  },
});

export const skillTools = {
  loadSkill,
  readFile,
  executeSkillScript,
  execBash,
};
