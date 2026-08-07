"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserSearch } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// ユーザー名(ID)を直接入力して、確認画面(/friends/add/[username])に遷移するフォーム
export function AddFriendByIdForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim().replace(/^@/, "");
    if (!trimmed) return;
    router.push(`/friends/add/${encodeURIComponent(trimmed)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="friend-username">ユーザー名(ID)で追加</Label>
        <div className="flex gap-2">
          <Input
            id="friend-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="taro_yamada"
            aria-label="ユーザー名(ID)"
          />
          <Button type="submit">
            <UserSearch size={16} /> 確認する
          </Button>
        </div>
        <p className="text-xs text-ink/50">相手のユーザー名(@から始まるID)を正確に入力してください。</p>
      </div>
    </form>
  );
}
