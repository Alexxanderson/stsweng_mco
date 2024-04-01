import Image from "next/image"
import { useRouter } from "next/navigation"
import { use, useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import { Loader2 } from "lucide-react"

import { uploadPostMedia } from "@/lib/storage-funcs"
import { firestore } from "@/lib/firebase"
import { getDocs, collection } from "firebase/firestore"
import { createPostDocument } from "@/lib/firestore-crud"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog"
import { handleDateFormat } from "@/lib/helper-functions"
import Link from "next/link"
import { Comment } from "@/components/post-components/comment"
import { onSnapshot } from "firebase/firestore"

import { Card, CardContent } from "@/components/ui/card"
import { EditPost } from "./edit-post"
import { DeletePost } from "./delete-post"

import likeReaction from '/public/images/post-reactions/like.png'
import heartReaction from '/public/images/post-reactions/heart.png'
import laughReaction from '/public/images/post-reactions/haha.png'
import wowReaction from '/public/images/post-reactions/wow.png'
import sadReaction from '/public/images/post-reactions/sad.png'
import angryReaction from '/public/images/post-reactions/angry.png'
import { ReportPost } from "./report-components/report-post"

export function ExpandedRepost({ post, currentUser }) {

    const router = useRouter();
    const [ currentImageIndex, setCurrentImageIndex ] = useState(0)

    const [commentsLength, setCommentsLength] = useState(0);
    const [reactionsLength, setReactionsLength] = useState(0);
    const [currentUserReaction, setCurrentUserReaction] = useState('');
    const [reactionOverlayVisible, setReactionOverlayVisible] = useState(false);
    const [reactionsPerType, setReactionsPerType] = useState({
        like: { userIDs: [] },
        heart: { userIDs: [] },
        haha: { userIDs: [] },
        wow: { userIDs: [] },
        sad: { userIDs: [] },
        angry: { userIDs: [] }
    });

    const [isFocused, setIsFocused] = useState(false);
    const [comments, setComments] = useState([]);
    const [commentBody, setCommentBody] = useState('');

    useEffect(() => {
        const commentsRef = firestore.collection('posts').doc(post.postID).collection('comments');

        const unsubscribe = onSnapshot(commentsRef, async (snapshot) => {
            let totalComments = snapshot.size;
            const comments = snapshot.docs.map((doc) => ({
                commentID: doc.id,
                ...doc.data()
            }));

            for (let doc of snapshot.docs) {
                const repliesSnapshot = await getDocs(collection(doc.ref, 'replies'));
                totalComments += repliesSnapshot.size;
            }

            setCommentsLength(totalComments);
            setComments(comments);
        });

        return () => {
            unsubscribe();
        };
    }, [post.postID]);

    useEffect(() => {
        const reactionsRef = firestore.collection('posts').doc(post.postID).collection('reactions');

        const unsubscribeReactions = onSnapshot(reactionsRef, async (snapshot) => {
            let totalReactions = 0;
            let currentUserReaction = null;

            const reactionTypes = ['like', 'heart', 'haha', 'wow', 'sad', 'angry']; // Replace with your actual reaction types

            for (let doc of snapshot.docs) {
                const reactionData = doc.data();
                totalReactions += reactionData.userIDs.length;

                if (reactionData.userIDs.includes(currentUser.uid)) {
                    currentUserReaction = reactionTypes.find(type => type === doc.id);
                }
            }

            // retrieve post reactions, store separately, to be seen in the 'View Reactions' dialog

            const reactionsPerType = {
                like: snapshot.docs.find(doc => doc.id === 'like')?.data(),
                heart: snapshot.docs.find(doc => doc.id === 'heart')?.data(),
                haha: snapshot.docs.find(doc => doc.id === 'haha')?.data(),
                wow: snapshot.docs.find(doc => doc.id === 'wow')?.data(),
                sad: snapshot.docs.find(doc => doc.id === 'sad')?.data(),
                angry: snapshot.docs.find(doc => doc.id === 'angry')?.data()
            };

            setReactionsPerType(reactionsPerType);

            setReactionsLength(totalReactions);
            setCurrentUserReaction(currentUserReaction);
        });

        return () => {
            unsubscribeReactions();
        };
    }, [post.postID, currentUser.uid]);

    const handleComment = async (event) => {

        if (commentBody === '') {
            toast.error("You can't post an empty comment!");
            return;
        }

        toast.success("You've commented!")
        event.preventDefault();
        try {
            const formData = new FormData();
            formData.append('postID', post.postID);
            formData.append('postAuthorID', post.authorID);
            formData.append('postAuthorDisplayName', post.authorDisplayName);
            formData.append('postAuthorUsername', post.authorUsername);
            formData.append('postAuthorPhotoURL', post.authorPhotoURL);
            formData.append('commentBody', commentBody);
            formData.append('commentDate', new Date().toISOString());
            formData.append('authorID', currentUser.uid);
            formData.append('authorDisplayName', currentUser.displayName);
            formData.append('authorUsername', currentUser.username);
            formData.append('authorPhotoURL', currentUser.userPhotoURL);

            // Call API to create comment
            await fetch('/api/posts/comment-post', {
                method: 'POST',
                body: formData
            }).then(response => response.json()).then(async data => {
                console.log(data);
                toast.success("Successfully commented on post!");
                setCommentBody('');
            });
            
        } catch (error) {
            console.error(error);
            toast.error("Error commenting on post. Please try again later.");
        }
    }

    const handleReaction = async (newReaction) => {
        const reactionsRef = firestore.collection('posts').doc(post.postID).collection('reactions');
        const reactionTypes = ['like', 'heart', 'haha', 'wow', 'sad', 'angry']; // Replace with your actual reaction types
        const notificationsRef = firestore.collection('users').doc(post.authorID).collection('notifications');

        for (let reaction of reactionTypes) {
            const reactionRef = reactionsRef.doc(reaction);
            const reactionDoc = await reactionRef.get();

            if (reactionDoc.exists) {
            const reactionData = reactionDoc.data();
            const userIDs = reactionData.userIDs;

            if (userIDs.includes(currentUser.uid)) {
                if (reaction === newReaction) {
                // User has reacted with the same type again, remove user from userIDs array
                const updatedUserIDs = userIDs.filter((userID) => userID !== currentUser.uid);
                await reactionRef.update({ userIDs: updatedUserIDs });
                setCurrentUserReaction('');
                } else {
                // User has reacted with a different type, remove user from current userIDs array
                const updatedUserIDs = userIDs.filter((userID) => userID !== currentUser.uid);
                await reactionRef.update({ userIDs: updatedUserIDs });
                }
            } else if (reaction === newReaction) {
                // User has not reacted with this type, add user to userIDs array
                await reactionRef.update({ userIDs: [...userIDs, currentUser.uid] });
                
                if (currentUser.uid !== post.authorID) {
                // Create a new document in the notificationsRef collection
                const notificationRef = notificationsRef.doc();
                await notificationRef.set({
                    userID: currentUser.uid,
                    action: "reacted to your post!",
                    date: new Date().toISOString(), // Get the server timestamp
                    postID: post.postID,
                    userPhotoURL: currentUser.userPhotoURL,
                    displayname: currentUser.displayName,
                    username: currentUser.username,
                });
                }
                }
            } else if (reaction === newReaction) {
            // Reaction does not exist, create reaction and add user to userIDs array
            await reactionRef.set({ userIDs: [currentUser.uid] });

            if (currentUser.uid !== post.authorID) {
                // Create a new document in the notificationsRef collection
                const notificationRef = notificationsRef.doc();
                await notificationRef.set({
                userID: currentUser.uid,
                action: "reacted to your post!",
                date: new Date().toISOString(),  // Get the server timestamp
                postID: post.postID,
                    userPhotoURL: currentUser.userPhotoURL,
                    displayname: currentUser.displayName,
                    username: currentUser.username,
                });
            }
            }
        }

        setReactionOverlayVisible(false);
    }

  return (
    (post.postType === 'Repost' &&
        <div className="w-full h-full flex flex-col">

            {/* expanded post */}
            <div className='w-full h-full rounded-lg mt-2 pr-6 pl-6 flex flex-col overflow-y-auto'>
                {/* header */}
                <div id="post-header" className="flex flex-col md:flex-row justify-between">

                    <div className="flex flex-row justify-start items-start">
                        <div id="author-image">
                            <Image src={post.authorPhotoURL ? post.authorPhotoURL : "/images/profilePictureHolder.jpg"} alt="author photo" width={50} height={50} className="rounded-full drop-shadow-sm aspect-square object-cover h-[40px] w-[40px] md:h-[45px] md:w-[45px] cursor-pointer hover:opacity-60" onClick={() => router.push(`/user/${post.authorUsername}`)} />
                        </div>

                        <div id="post-meta" className="ml-4 items-center justify-center">
                            <div id="user-meta" className="flex flex-row gap-2 text-sm md:text-base">
                                <div id="display-name">
                                    <p className="font-bold">{post.authorDisplayName}</p>
                                </div>
                                <div className='font-bold'>·</div>
                                <Link href={`/user/${post.authorUsername}`} id="username" className="hover:text-muted_blue dark:hover:text-light_yellow hover:font-bold transition-all">
                                    <p>@{post.authorUsername}</p>
                                </Link>
                            </div>
                            
                            <div id="publish-date" className="flex flex-row gap-2 items-center">
                                <p className="text-xs md:text-sm">{handleDateFormat(post.date)}</p>
                                
                                { post.isEdited ? 
                                    (
                                        <div className="relative flex flex-row items-center gap-2 group">
                                            <i className="hover-tooltip fa-solid fa-clock-rotate-left text-[10px] md:text-xs"/>
                                            <p className="edited-post-tooltip hidden group-hover:block text-xs">Edited Post</p>
                                        </div>
                                    ) : null
                                }
                            </div>
                        </div>
                    </div>
                </div>

                {/* body */}
                <div id="post-body" className='mt-2 md:mt-3 flex flex-col'>
                    { post.reportStatus == "verified" ? 
                        <div className="items-center mt-5 w-full flex justify-center">
                            <span>This post violates our guidelines and has been taken down.</span>
                        </div>
                    :
                    <>
                        { post.content !== '' && post.content !== null && post.content !== undefined &&
                            <DialogTrigger asChild>
                                <div id="post-content" className="flex flex-col mt-1 cursor-pointer">
                                    <p className="text-sm md:text-base">{post.content}</p>
                                </div>
                            </DialogTrigger>
                        }

                        {/* reposted post */}
                        <Link
                            href={`/post/${post.originalPostID}`}
                        >
                        <div id="reposted-post" className={`${post.content === '' ? "mt-2" : "mt-4"} flex flex-col border border-black dark:border-white rounded-md p-4`}>

                            <div className="flex flex-row justify-start items-start">
                                <div id="author-image">
                                    <Image src={post.originalPostAuthorPhotoURL ? post.originalPostAuthorPhotoURL : "/images/profilePictureHolder.jpg"} alt="author photo" width={50} height={50} className="rounded-full drop-shadow-sm aspect-square object-cover h-[40px] w-[40px] md:h-[45px] md:w-[45px]" />
                                </div>

                                <div id="post-meta" className="ml-4 items-center justify-center">
                                    <div id="user-meta" className="flex flex-row gap-2 text-sm md:text-base">
                                        <div id="display-name">
                                            <p className="font-bold">{post.originalPostAuthorDisplayName}</p>
                                        </div>
                                        <div className='font-bold'>·</div>
                                        <Link href={`/user/${post.originalPostAuthorUsername}`} id="username" className="hover:text-muted_blue dark:hover:text-light_yellow hover:font-bold transition-all">
                                            <p>@{post.originalPostAuthorUsername}</p>
                                        </Link>
                                    </div>
                                    
                                    <div id="publish-date" className="flex flex-row gap-2 items-center">
                                        <p className="text-xs md:text-sm">{handleDateFormat(post.originalPostDate)}</p>
                                    </div>
                                </div>
                            </div>


                        
                            { post.originalReportStatus == "verified" ? 
                                    <div className="items-center mt-5 w-full flex justify-center">
                                        <span>This post violates our guidelines and has been taken down.</span>
                                    </div>
                                :
                                    <div id="reposted-post-content" className="flex flex-row items-start justify-between mt-4 gap-8">
                                        <p className="w-full text-sm md:text-base">{post.originalPostContent}</p>

                                        {/* original post images, if any (only show the first one) */}
                                        { post.originalPostMedia && post.originalPostMedia.length > 0 &&
                                            <div id="reposted-post-images" className="justify-end flex w-[30%] ">
                                                <Image
                                                    src={post.originalPostMedia[0]}
                                                    alt="reposted post image"
                                                    width={100}
                                                    height={100}
                                                    className="rounded-md drop-shadow-sm aspect-square object-cover"
                                                />
                                            </div>
                                        }
                                    </div>
                                }
                            
                        </div>      
                        </Link>
                    </>
                    }
                </div>

                {/* footer */}
                <div id="post-footer" className="mt-4 flex flex-row w-full justify-between relative">
                    <div id="left" className="flex flex-row gap-4 text-sm md:text-base items-center">
                        <div id="post-reaction-control" className="flex flex-row justify-center items-center gap-2 w-fit h-6">
                            { !currentUserReaction &&
                                <i
                                    className="fa-solid fa-heart hover:text-muted_blue dark:hover:text-light_yellow hover:cursor-pointer transition-all" 
                                    onClick={() => setReactionOverlayVisible(true)}
                                    onMouseEnter={() => setReactionOverlayVisible(true)}
                                />    
                            }

                            { currentUserReaction === 'like' &&
                                <Image
                                    src={likeReaction}
                                    alt="like reaction"
                                    className={`w-fit h-[21px] flex items-center justify-center hover:transform transition-all`}
                                    onMouseEnter={() => setReactionOverlayVisible(true)}
                                />
                            }

                            { currentUserReaction === 'heart' &&
                                <Image
                                    src={heartReaction}
                                    alt="heart reaction"
                                    className={`w-fit h-[21px] flex items-center justify-center hover:transform transition-all`}
                                    onMouseEnter={() => setReactionOverlayVisible(true)}
                                />
                            }

                            { currentUserReaction === 'haha' &&
                                <Image
                                    src={laughReaction}
                                    alt="haha reaction"
                                    className={`w-fit h-[21px] flex items-center justify-center hover:transform transition-all`}
                                    onMouseEnter={() => setReactionOverlayVisible(true)}
                                />
                            }

                            { currentUserReaction === 'wow' &&
                                <Image
                                    src={wowReaction}
                                    alt="wow reaction"
                                    className={`w-fit h-[21px] flex items-center justify-center hover:transform transition-all`}
                                    onMouseEnter={() => setReactionOverlayVisible(true)}
                                />
                            }

                            { currentUserReaction === 'sad' &&
                                <Image
                                    src={sadReaction}
                                    alt="sad reaction"
                                    className={`w-fit h-[21px] flex items-center justify-center hover:transform transition-all`}
                                    onMouseEnter={() => setReactionOverlayVisible(true)}
                                />
                            }

                            { currentUserReaction === 'angry' &&
                                <Image
                                    src={angryReaction}
                                    alt="angry reaction"
                                    className={`w-fit h-[21px] flex items-center justify-center hover:transform transition-all`}
                                    onMouseEnter={() => setReactionOverlayVisible(true)}
                                />
                            }                    

                            <p>{reactionsLength}</p>

                            {reactionOverlayVisible && (
                                <div 
                                    onMouseEnter={() => setReactionOverlayVisible(true)}
                                    onMouseLeave={() => setReactionOverlayVisible(false)}
                                    id='overlay' 
                                    className='absolute -left-1 md:-left-2 flex flex-row gap-2 md:w-[300px] md:h-[45px] justify-center items-center bg-off_white dark:bg-dark_gray rounded-full drop-shadow-sm transition-all' 
                                >
                                    <Image 
                                        src={likeReaction} 
                                        alt="like reaction" 
                                        className='w-fit h-[40px] hover:scale-125 hover:transform transition-all'
                                        onClick={() => handleReaction('like')}
                                    />
                                    <Image 
                                        src={heartReaction} 
                                        alt="like reaction" 
                                        className='w-fit h-[40px] hover:scale-125 hover:transform transition-all'
                                        onClick={() => handleReaction('heart')}
                                    />
                                    <Image 
                                        src={laughReaction} 
                                        alt="like reaction" 
                                        className='w-fit h-[40px] hover:scale-125 hover:transform transition-all'
                                        onClick={() => handleReaction('haha')}
                                    />
                                    <Image 
                                        src={wowReaction} 
                                        alt="like reaction" 
                                        className='w-fit h-[40px] hover:scale-125 hover:transform transition-all'
                                        onClick={() => handleReaction('wow')}
                                    />
                                    <Image 
                                        src={sadReaction} 
                                        alt="like reaction" 
                                        className='w-fit h-[40px] hover:scale-125 hover:transform transition-all'
                                        onClick={() => handleReaction('sad')}
                                    />
                                    <Image 
                                        src={angryReaction} 
                                        alt="like reaction" 
                                        className='w-fit h-[40px] hover:scale-125 hover:transform transition-all'
                                        onClick={() => handleReaction('angry')}
                                    />
                                </div>
                            )}
                        </div>

                        <div id="comment-control" className="flex flex-row justify-center items-center gap-2">
                            <i 
                                onClick={() => {
                                    document.getElementById('comment-body').focus();  
                                }}
                                className="fa-solid fa-comment hover:text-muted_blue dark:hover:text-light_yellow hover:cursor-pointer transition-all" />
                            <p>{commentsLength}</p>
                        </div>

                        <div id="share-control">
                            <i
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/post/${post.postID}`);
                                    toast.success("Link copied to clipboard!");
                                }}
                                className="fa-solid fa-link hover:text-muted_blue dark:hover:text-light_yellow hover:cursor-pointer transition-all" />
                        </div>
                    </div>

                    <div id="right" className="flex flex-row gap-4 items-center text-sm md:text-base">
                        {currentUser.uid !== post.authorID && 
                            <div>
                            <ReportPost props={{
                                    currentUser: currentUser,
                                    post: post,
                                    postReports: post.reports,
                                }}/>
                        </div>
                        }

                        {currentUser.uid === post.authorID && 
                            <>
                                <EditPost props={{
                                    postID: post.postID,
                                    postIsEdited: post.isEdited,
                                    content: post.content,
                                    category: post.category,
                                    postType: post.postType
                                }}/>

                                <DeletePost postID={post.postID}/>
                            </>
                        }
                    </div>
                </div>

                <hr className="mt-4 bg-gray"/>

                {/* reactions */}
                <Dialog>
                    <DialogTrigger asChild>
                        <p className="text-sm mt-4 hover:underline cursor-pointer w-fit">View Reactions...</p>
                    </DialogTrigger>
                    <DialogContent className="w-[350px]">
                        <div className="flex flex-col gap-2 w-full h-full">
                            <div className="flex flex-row gap-2 items-center">
                                <p className="font-bold">Reactions</p>
                                <p>{reactionsLength}</p>
                            </div>
                            <div className="flex flex-row gap-2 items-center">
                                <Image src={likeReaction} alt="like reaction" className="w-[20px] h-[20px]"/>
                                <p>{reactionsPerType.like ? reactionsPerType.like.userIDs.length : 0}</p>
                            </div>
                            <div className="flex flex-row gap-2 items-center">
                                <Image src={heartReaction} alt="heart reaction" className="w-[20px] h-[20px]"/>
                                <p>{reactionsPerType.heart ? reactionsPerType.heart.userIDs.length : 0}</p>
                            </div>
                            <div className="flex flex-row gap-2 items-center">
                                <Image src={laughReaction} alt="haha reaction" className="w-[20px] h-[20px]"/>
                                <p>{reactionsPerType.haha ? reactionsPerType.haha.userIDs.length : 0}</p>
                            </div>
                            <div className="flex flex-row gap-2 items-center">
                                <Image src={wowReaction} alt="wow reaction" className="w-[20px] h-[20px]"/>
                                <p>{reactionsPerType.wow ? reactionsPerType.wow.userIDs.length : 0}</p>
                            </div>
                            <div className="flex flex-row gap-2 items-center">
                                <Image src={sadReaction} alt="sad reaction" className="w-[20px] h-[20px]"/>
                                <p>{reactionsPerType.sad ? reactionsPerType.sad.userIDs.length : 0}</p>
                            </div>
                            <div className="flex flex-row gap-2 items-center">
                                <Image src={angryReaction} alt="angry reaction" className="w-[20px] h-[20px]"/>
                                <p>{reactionsPerType.angry ? reactionsPerType.angry.userIDs.length : 0}</p>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            
                {/* comments */}
                <div id='post-comments' className='mt-3 mb-4 flex h-full flex-col w-full justify-between relative'>
                    {comments.length === 0 ? (
                        <div className='flex text-sm'>
                            No comments yet...
                        </div>    
                    ) : (
                        <div className='flex flex-col w-full h-fit gap-3 justify-start items-start'>
                            {comments.map((comment, index) => (
                                <div key={comment.commentID} className='w-full h-fit'>
                                    <Comment 
                                        props = {{
                                            currentUser: currentUser,
                                            postID: post.postID,
                                            postAuthorID: post.authorID,
                                            postAuthorDisplayName: post.authorDisplayName,
                                            postAuthorUsername: post.authorUsername,
                                            postAuthorPhotoURL: post.authorPhotoURL,
                                            commentID: comment.commentID,
                                            commentBody: comment.commentBody,
                                            commentDate: comment.commentDate,
                                            authorID: comment.authorID,
                                            authorDisplayName: comment.authorDisplayName,
                                            authorUsername: comment.authorUsername,
                                            authorPhotoURL: comment.authorPhotoURL,
                                            isEdited: comment.isEdited,
                                            // replies: comment.replies
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* write comment */}
            <div id='write-comment' className='mt-3 pb-3 pl-6 pr-6'>
                <form 
                    onSubmit={handleComment}
                    className='flex flex-row items-start justify-center h-full'>
                    <div className='flex aspect-square w-[40px] h-[40px] mr-2 mt-1'>
                        {currentUser && <Image src={currentUser.userPhotoURL  ? currentUser.userPhotoURL : "/images/profilePictureHolder.jpg"} alt="user image" width={40} height={40} className='rounded-full drop-shadow-sm '/>}
                    </div>

                    <textarea 
                        id="comment-body" 
                        value={commentBody}
                        onChange={(event) => setCommentBody(event.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        maxLength={100}
                        placeholder='Write a comment...' 
                        className={`outline-none resize-none border bg-[#fafafa] dark:bg-black text-md rounded-xl text-raisin_black w-full p-3 transition-all ${isFocused ? 'max-h-[80px]' : 'max-h-[50px]'}`}
                    />

                    <Button
                        type='button'
                        onClick={handleComment}
                        className='w-[40px] h-[40px] rounded-full ml-2 mt-1'>
                        <i className='fa-solid fa-paper-plane text-sm'></i>
                    </Button>
                </form>
            </div>
        </div>
    )
  )
}