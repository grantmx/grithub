import axios from "axios";
import PayfastService from "../../../services/payfast/payfast.service";


export default function handler(req, res) {
	const payfastService = new PayfastService()
// console.log(payfastService.data)

	if( req.method === "POST"){
		return axios.post({
				method: "POST",
				url: `https://sandbox.payfast.co.za/onsite/process`,
				data: payfastService.data
			})
			.then((res) => {
				res.status(200).json(res.data.uuid)

				// return res.data.uuid || null;
			})
			.catch((error) => {
				// console.error(error)

				res.status(400).json(error.response)
			});
	}
}