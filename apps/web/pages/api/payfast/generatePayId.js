import axios from "axios";
import PayfastService from "services/payfast/payfast.service";


export default function handler(req, res) {
	const payfastService = new PayfastService()
console.log(payfastService.pfParamString)

	if( req.method === "POST"){
		return axios.post(`https://www.payfast.co.za/onsite/process`, payfastService.pfParamString
			)
			.then((res) => {
				res.status(200).json(res.data)
			})
			.catch((error) => {
				res.status(400).json(error)
			});
	}
}