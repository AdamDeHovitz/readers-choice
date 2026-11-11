"use server";

import * as themes from "@/server/operations/themes";
import { serverAction } from "./server-action";

export const suggestTheme = serverAction(themes.suggestTheme);
export const toggleThemeUpvote = serverAction(themes.toggleThemeUpvote);
export const deleteTheme = serverAction(themes.deleteTheme);
export const getThemeSuggestions = serverAction(themes.getThemeSuggestions);
