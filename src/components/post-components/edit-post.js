import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function EditPost({ props }) {
    const [loading, setLoading] = useState(false);
    const [isEdited, setIsEdited] = useState(false);

    const { postID, postIsEdited, content, category  } = props;

    const [newContent, setNewContent] = useState(content);
    const [newCategory, setNewCategory] = useState(category);

    const handleSavePostChanges = async (event) => {
        event.preventDefault();
        setLoading(true)
        try {
            // Save User Data
            await savePostData();
            setLoading(false);
            toast.success('Post successfully updated!')
            window.location.reload();
            handleEditSuccess();
    
        } catch (error) {
            console.error(error);
            setLoading(false);
            toast.error('An error occurred while updating the post.');
        } 
    }
    
    async function savePostData() {
        await fetch('/api/posts/edit-post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'updatePostData', 
                postID, 
                isEdited,
                content: newContent, 
                category: newCategory
            }) 
        }).then(response => {
            if (response.ok) {
                const data = response.json();
                if (data.success) {
                    toast.success(`Successfully updated post!`);
                }
            } else {
                throw new Error('Failed to save post');
            }
        });
    }

    const handleEditSuccess = () => {
        setIsEdited(true); 
        console.log("Post edited successfully, isEdited state:", isEdited);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <i
                    id="edit-control"
                    className="fa-solid fa-pencil hover:text-muted_blue dark:hover:text-light_yellow hover:cursor-pointer transition-all"
                />
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] lg:max-w-[720px]">
                <DialogHeader>
                    <DialogTitle className="text-center">Edit Post</DialogTitle>
                </DialogHeader>
                <hr className="border-b border-muted_blue dark:border-light_yellow my-2 mx-4" />
                <form onSubmit={handleSavePostChanges}>
                    <div className="flex flex-col w-full mb-4">
                        <div className="flex flex-col w-full px-10">
                            <div className="flex justify-end w-full">
                                <Select required onValueChange={(value) => setNewCategory(value)} value={newCategory}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="General">General</SelectItem>
                                        <SelectItem value="Q&A">Q&A</SelectItem>
                                        <SelectItem value="Tips">Tips</SelectItem>
                                        <SelectItem value="Pet Needs">Pet Needs</SelectItem>
                                        <SelectItem value="Milestones">Milestones</SelectItem>
                                        <SelectItem value="Lost Pets">Lost Pets</SelectItem>
                                        <SelectItem value="Unknown Owner">Unknown Owner</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="mt-4">
                                <Label htmlFor="post-content" className="text-lg font-normal mb-2">Content</Label>
                                <Textarea
                                    type="text"
                                    id="post-content"
                                    value={newContent}
                                    onChange={(e) => setNewContent(e.target.value)}
                                    placeholder="What's on your mind?"
                                    className={`my-2 p-2 rounded-md w-full`}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        {loading ?
                            <Button disabled>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Please wait
                            </Button>
                            :
                            <Button type="submit" className="mt-6">Update Post</Button>
                        }
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}