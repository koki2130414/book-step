"use client";
import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { readingGoalSchema, type ReadingGoalInput } from "@/lib/validations/profile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast-provider";
import { upsertReadingGoal } from "@/app/(main)/profile/actions";

export function GoalForm() {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const now = new Date();

  const { register, handleSubmit, control, watch } = useForm<ReadingGoalInput>({
    resolver: zodResolver(readingGoalSchema),
    defaultValues: {
      goalType: "monthly",
      targetYear: now.getFullYear(),
      targetMonth: now.getMonth() + 1,
      targetCount: 1,
    },
  });

  const goalType = watch("goalType");

  const onSubmit = (values: ReadingGoalInput) => {
    startTransition(async () => {
      try {
        await upsertReadingGoal(values);
        showToast("読書目標を保存しました");
      } catch (e) {
        showToast(e instanceof Error ? e.message : "保存に失敗しました", "error");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="goalType">目標の種類</Label>
        <Controller
          control={control}
          name="goalType"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="goalType"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">月間読書冊数</SelectItem>
                <SelectItem value="yearly">年間読書冊数</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="targetCount">目標冊数</Label>
        <Input id="targetCount" type="number" min={1} {...register("targetCount")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="targetYear">対象年</Label>
          <Input id="targetYear" type="number" {...register("targetYear")} />
        </div>
        {goalType === "monthly" && (
          <div className="space-y-1.5">
            <Label htmlFor="targetMonth">対象月</Label>
            <Input id="targetMonth" type="number" min={1} max={12} {...register("targetMonth")} />
          </div>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "保存中..." : "目標を保存する"}
      </Button>
    </form>
  );
}
