import Image from "next/image"
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import { Loader2 } from "lucide-react"
import { uploadPostMedia } from "@/lib/storage-funcs"
import { firestore } from "@/lib/firebase"
import { createPostDocument } from "@/lib/firestore-crud"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MultiSelect } from "@/components/ui/multi-select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faImage } from "@fortawesome/free-solid-svg-icons"


export function CreatePost({props}) {
    const [loading, setLoading] = useState(false);

    const { uid, username, displayname, userphoto, pets } = props;
    
    const [ postAuthorID, setPostAuthorID ] = useState(uid);
    const [ postAuthorName, setPostAuthorName ] = useState(username);
    const [ postAuthorDisplayName, setPostAuthorDisplayName ] = useState(displayname);
    const [ postAuthorPhotoURL, setPostAuthorPhotoURL ] = useState(userphoto);
    const [ postContent, setPostContent] = useState('');
    const [ postCategory, setPostCategory] = useState('');
    const [ postTaggedPets, setPostTaggedPets] = useState([]);
    const [ postImageURLs, setPostImageURLs] = useState([]);

    const [ mediaFiles, setMediaFiles] = useState([]);
    const [ previewMedia, setPreviewMedia] = useState([]);

    const handleSelectPets = (selectedPets) => {
        setPostTaggedPets(selectedPets)
    }
    const [ selectedPetIDs, setSelectedPetIDs] = useState([]);

    const [ displayValue, setDisplayValue] = useState('');

    const handleMediaFiles = (event) => {
        event.preventDefault();
        const files = event.target.files;
        if (files.length === 0) {
            setMediaFiles([]);
            setPreviewMedia([]);
        } else {
            const temp = handleImageFilePreview(files);
            if (temp === null) {
                setMediaFiles([]);
                setPreviewMedia([]);
            } else {
                setMediaFiles(temp[0]);
                setPreviewMedia(temp[1]);
            }
        }
    };
    
    const handleImageFilePreview = (files) => {
        const allowedTypes = ['image/jpeg', 'image/png']; // Add more types if needed
        const images = [];
        const previews = [];
    
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (allowedTypes.includes(file.type)) {
                previews.push(URL.createObjectURL(file));
                images.push(file);
            } else {
                toast.alert(`File ${file.name} is not a valid image.`);
                return null;
            }
        }
    
        return [images, previews];
    };

    const createPost = async (event) => {
        event.preventDefault();
        setLoading(true);
        try {
            const postID = await firestore.collection("pets").doc().id;
            const promises = [];
            if (mediaFiles.length > 0) {
                mediaFiles.forEach((file) => {
                    promises.push(uploadPostMedia(postID, file));
                });
            }
            Promise.all(promises).then((values) => {
                setPostImageURLs(values);
                setLoading(false);
                const postDetails = {
                    postID: postID,
                    authorID: postAuthorID,
                    authorName: postAuthorName,
                    authorDisplayName: postAuthorDisplayName,
                    authorPhotoURL: postAuthorPhotoURL,
                    content: postContent,
                    category: postCategory,
                    taggedPets: postTaggedPets,
                    imageURLs: values,
                    date: new Date().toISOString()
                };
                // Call a function to save the post details to the database
                savePostDetails(postDetails);
            });
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    }

    const savePostDetails = (postDetails) => {
        createPostDocument("posts", postDetails.postID, postDetails).then(() => {
            toast.success("Post created successfully!");
            setPostContent('');
            setPostCategory('');
            setPostTaggedPets([]);
            setPostImageURLs([]);
            setMediaFiles([]);
            setPreviewMedia([]);
            setSelectedPetIDs([]);
            setLoading(false);
        })
        .catch((error) => {
            console.error(error);
            toast.error("Error creating post. Please try again later.");
        });
    }

    useEffect(() => {
        if (selectedPetIDs.length > 0) {
            const selectedPets = pets.filter((pet) => selectedPetIDs.includes(pet.petID));
            setPostTaggedPets(selectedPets);
            setDisplayValue(selectedPets.map((pet) => pet.petName).join(", "));
        }
        
    }, [selectedPetIDs]);

    return (
        <Dialog>
            <div className="flex flex-row items-center"> 
                <DialogTrigger asChild>
                    <Button variant="outline" className="h-[35px] w-11/12 bg-light_yellow hover:bg-primary text-primary-foreground hover:text-primary-foreground gap-2 flex items-center justify-center rounded-full">
                        What&apos;s on your mind? 
                    </Button>
                </DialogTrigger>
                <DialogTrigger asChild>
                    <Button variant="outline" className="p-1.5 bg-light_yellow hover:bg-primary text-primary-foreground hover:text-primary-foreground rounded-full aspect-square mx-auto">
                        <FontAwesomeIcon icon={faImage} class="w-5 h-5 text-white dark:text-dark_gray"></FontAwesomeIcon>
                    </Button>
                </DialogTrigger>
            </div>
            <DialogContent className="sm:max-w-[600px] lg:max-w-[720px]">
                    
                <DialogHeader>
                    <DialogTitle className="text-center">Write a Post</DialogTitle>
                </DialogHeader>
                <hr className="border-b border-light_yellow my-2 mx-4"/>
                <form onSubmit={createPost}>
                    <div className="flex flex-col w-full mb-4">
                        <div className="flex flex-row w-full px-10 gap-12">
                            <div className="flex flex-col items-center w-2/5">
                                <Label htmlFor="category" className={"my-4 w-full"} > Post Category </Label>
                                <Select required onValueChange={(value) => setPostCategory(value)} defaultValue={''}>
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
                            <div className="flex flex-col items-center w-3/5">
                                <Label htmlFor="pets" className={"my-4 w-full"} >Tag your Pets!</Label>
                                <MultiSelect 
                                    options={pets.map(pet=>({value: pet.petID, label: pet.petName}))}
                                    selected={selectedPetIDs}
                                    onChange={setSelectedPetIDs}
                                    className={"w-full rounded-md"}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col w-full px-10">
                            <div className="flex flex-col items-left w-full">
                                <Textarea 
                                    type="text" 
                                    id="post-content" 
                                    value={postContent} 
                                    className={`mt-2 p-2 rounded-md w-full`} 
                                    placeholder="What's on your mind?" 
                                    maxLength={400}
                                    minLength={1}
                                    onChange={(e) => setPostContent(e.target.value)} />
                            </div>
                            <div className="flex flex-col items-left w-full">
                                <Label htmlFor="media" className={"my-4 w-full"} >Upload Media </Label>
                                <Input id="media" type="file" multiple onChange={handleMediaFiles} />
                                <div className="flex flex-row gap-2 w-full mt-4">
                                    {previewMedia.map((media, index) => (
                                        <Image key={index} src={media} alt={`Media ${index}`} width={80} height={80}/>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        {loading ? 
                            <Button disabled>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Please wait
                            </Button>
                        :   <Button type="submit" className="mt-6">Create Post</Button>}
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
