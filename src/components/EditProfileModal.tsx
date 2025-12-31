import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Camera, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
    const { user, token } = useAuth(); // Use current user and token from context
    const [isLoading, setIsLoading] = useState(false);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");

    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Sync state with user data when modal opens
    useEffect(() => {
        if (isOpen && user) {
            setFullName(user.full_name || "");
            setEmail(user.email || "");
            setPreviewUrl(user.profile_image_url || null);
        }
    }, [isOpen, user]);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            toast.error("Image size must be less than 2MB");
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch("/auth/avatar", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) throw new Error("Failed to upload avatar");

            const data = await response.json();
            setPreviewUrl(data.url);
            toast.success("Avatar uploaded! Save changes to apply.");

        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Failed to upload image");
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveAvatar = async (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent form submission
        e.stopPropagation();

        if (!confirm("Remove profile picture?")) return;

        try {
            const response = await fetch("/auth/avatar", {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`,
                }
            });

            if (!response.ok) throw new Error("Failed to remove avatar");

            setPreviewUrl(null);
            toast.success("Avatar removed.");

        } catch (error) {
            console.error("Remove error:", error);
            toast.error("Failed to remove image");
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch("/auth/profile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`, // Use the valid token from context
                },
                body: JSON.stringify({
                    full_name: fullName,
                    email: email,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to update profile");
            }

            const updatedUser = await response.json();

            toast.success("Profile updated successfully!");
            onClose();

            // Reload to refresh the auth context with new data
            setTimeout(() => window.location.reload(), 1000);

        } catch (error: any) {
            console.error("Update error:", error);
            toast.error(error.message || "Failed to update profile");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                        Update your profile details below.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpdate}>
                    <div className="grid gap-4 py-4">

                        {/* Avatar Upload Section */}
                        <div className="flex flex-col items-center justify-center gap-3 py-2">
                            <div className="relative group cursor-pointer">
                                <Avatar className="h-20 w-20 border-2 border-border group-hover:border-primary transition-colors">
                                    <AvatarImage src={previewUrl || undefined} />
                                    <AvatarFallback className="text-lg bg-muted text-muted-foreground">
                                        {fullName ? fullName.charAt(0).toUpperCase() : "U"}
                                    </AvatarFallback>
                                </Avatar>
                                <Label
                                    htmlFor="avatar-upload"
                                    className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 rounded-full transition-opacity cursor-pointer"
                                >
                                    {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                                </Label>
                                <Input
                                    id="avatar-upload"
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                    disabled={isUploading}
                                />
                                {previewUrl && (
                                    <button
                                        type="button"
                                        onClick={handleRemoveAvatar}
                                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 shadow-sm hover:bg-destructive/90 transition-colors z-10"
                                        title="Remove picture"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                            <span className="text-xs text-muted-foreground">Click to upload (Max 2MB)</span>
                        </div>

                        <div className="flex flex-col sm:grid sm:grid-cols-4 items-center gap-2 sm:gap-4">
                            <Label htmlFor="name" className="text-left sm:text-right font-medium sm:font-normal">
                                Name
                            </Label>
                            <Input
                                id="name"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="sm:col-span-3"
                            />
                        </div>
                        <div className="flex flex-col sm:grid sm:grid-cols-4 items-center gap-2 sm:gap-4">
                            <Label htmlFor="email" className="text-left sm:text-right font-medium sm:font-normal">
                                Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="sm:col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
