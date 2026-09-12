// src/actions/index.ts
import { authActions } from "@/features/auth/auth";
import { postActions } from "@/features/posts/posts";
import { agendaActions } from "@/features/agenda/agenda";
import { profileActions } from "@/features/auth/profile";
import { categoryActions } from "@/features/posts/categories";
import { contactActions } from "@/features/home/contact";

export const server = {
  ...authActions,
  ...postActions,
  ...agendaActions,
  ...profileActions,
  ...categoryActions,
  ...contactActions,
};
