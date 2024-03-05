import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, } from "@/components/ui/card";
import { PetSnippetCard } from "@/components/PetSnippetCard";
import { CreatePetProfile } from "@/components/profile/create-pet-profile";
import { Image } from 'next/image';

export function PetsContainer({ props }) {
    
    const { uid, username, displayName, location, coverPhotoURL, pets } = props;

    return (
        <Card className="w-full flex items-center justify-center">
            <div className="flex flex-wrap gap-4 items-center justify-center w-full py-4">

                <CreatePetProfile props={{
                    uid: uid,
                    username: username,
                    displayName: displayName,
                    location: location,
                    coverPhotoURL: coverPhotoURL
                }}/>
                
                {[...pets].reverse().map((pet, index) => {
                    return (
                        <PetSnippetCard 
                            key={index}
                            props={{
                                petName: pet.petName,
                                petBreed: pet.petBreed,
                                petPhotoURL: pet.petPhotoURL,
                                petID: pet.petID,
                            }}
                        />
                    )}
                )}
            </div>
        </Card>
    )
}