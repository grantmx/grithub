import { doc } from "services/google/googleSheets";

export default async function handler(req, res){
    if( req.method === "POST" ){

        try{
            await doc.loadInfo();

            const sheet = doc.sheetsByIndex[0];

            await sheet.addRow(req.body)

            res.status(200).json("done")

        }catch(err){
            console.error(err)
            res.status(400).json(err)
        }
    }

}
